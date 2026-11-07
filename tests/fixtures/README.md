# Audio fixture

`background-silence.mp3` contains 40 synthetic MPEG audio frames (silent), with no third-party music or personal data. Browser E2E tests decode the actual bytes, check currentTime advancement, loop configuration and pause, without mocking HTMLMediaElement.

To reproduce with installed Node.js:

```js
const frame = Buffer.alloc(417);
frame.set([255, 251, 144, 0]);
fs.writeFileSync(path, Buffer.concat(Array.from({ length: 40 }, () => frame)));
```

Storage signing/transport remains mocked in this local test. It does not prove production RLS, audible output, or device autoplay permission.
