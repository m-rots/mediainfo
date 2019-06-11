import { PathLike, createReadStream, statSync } from 'fs';
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

export = async function MediaInfo(path: PathLike): Promise<MediaInfoResponse> {
  if (!MediaInfoModule) {
    await Init();
  }
  return new Promise((resolve) => {
    const stream = createReadStream(path, {
      highWaterMark: 1024 * 1024,
    });
    const { size } = statSync(path);

    const MI = new MediaInfoModule.MediaInfo();
    MI.Open_Buffer_Init(size, 0);

    let seekTo: number;

    stream.on('data', (chunk) => {
      MI.Open_Buffer_Continue(chunk);
      seekTo = MI.Open_Buffer_Continue_Goto_Get();
      // console.log('SeekTo', seekTo);

      if (seekTo !== -1) {
        MI.Open_Buffer_Init(size, seekTo);
        stream.close();
      }
    });

    stream.on('close', () => {
      const newstream = createReadStream(path, {
        highWaterMark: 1024 * 1024,
        start: seekTo,
      });

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
