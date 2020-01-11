import mediainfo from '../src';

mediainfo('http://dl5.webmfiles.org/big-buck-bunny_trailer.webm').then(
  (response) => {
    console.log(JSON.stringify(
      response, null, 2,
    ));
  },
).catch((err) => {
  console.error(err);
});
