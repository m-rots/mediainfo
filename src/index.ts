import { PathLike, createReadStream, stat } from 'fs';
import * as Request from 'request';
import {
  Audio, General, Image, Menu, Other, Text, Video,
} from './types';

const MediaInfoLib = require('../lib/MediaInfoWasm.js');

interface MediaInfoResponse {
  media: {
    '@ref': string
    track: [
      Audio | General | Image | Menu | Other | Text | Video
    ]
  }
}

let MediaInfoModule: any = false;

async function Init() {
  return new Promise((resolve) => {
    MediaInfoModule = MediaInfoLib({
      postRun: () => {
        resolve();
      },
    });
  });
}

async function GetSize(path: PathLike, headers = {}) {
  return new Promise((resolve, reject) => {
    if (path.toString().indexOf('http') === 0) {
      return Request({
        method: 'HEAD',
        url: path,
        headers
      }).on('response', (res) => {
        resolve(parseInt(res.headers['content-length'], 10) || 0);
      }).on('error', (err) => {
        reject(err);
      })
    }
    stat(path, (err, stats) => {
      if (err) {
        return reject(err);
      }
      resolve(stats.size || 0)
    })
  })
}

function GetStream(path: PathLike, start = 0, length = -1, headers = {}) {
  if (path.toString().indexOf('http') === 0) {
    return Request({
      url: path,
      headers: {
        ...headers,
        Range: `bytes=${start}-${length}`
      }
    })
  }
  return createReadStream(path, {
    highWaterMark: length,
    start,
  });
}

export default function MediaInfo(path: PathLike, headers = {}): Promise<MediaInfoResponse> {
  return new Promise(async (resolve) => {

    if (!MediaInfoModule) {
      await Init();
    }

    let seekTo: number;

    const stream = GetStream(path, 0, 1024 * 1024, headers);
    const size = await GetSize(path);

    const MI = new MediaInfoModule.MediaInfo();
    MI.Open_Buffer_Init(size, 0);


    stream.on('data', (chunk) => {
      MI.Open_Buffer_Continue(chunk);
      seekTo = MI.Open_Buffer_Continue_Goto_Get();
      // console.log('SeekTo', seekTo);

      if (seekTo !== -1) {
        MI.Open_Buffer_Init(size, seekTo);
        if (stream.close) {
          stream.close();
        }
      }
    });

    stream.on('close', () => {
      const newstream = GetStream(path, seekTo, 1024 * 1024, headers);

      newstream.on('data', (chunk) => {
        MI.Open_Buffer_Continue(chunk);
        seekTo = MI.Open_Buffer_Continue_Goto_Get();
        // console.log('SeekTo', seekTo);
      });

      newstream.on('close', () => {
        MI.Open_Buffer_Finalize();

        MI.Option('Output', 'JSON');
        MI.Option('Complete');
        const output: MediaInfoResponse = JSON.parse(MI.Inform());
        MI.Close();
        MI.delete();

        resolve(output);
      });
    });
  });
};
