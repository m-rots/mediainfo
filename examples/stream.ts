import mediainfo from '../src';

mediainfo('<File or URL>').then(
  (response) => {
    console.log(JSON.stringify(
      response, null, 2,
    ));
  },
).catch((err) => {
  console.error(err);
});
