
const express = require("express");
const { Transform } = require("stream");
const { BlobServiceClient } = require("@azure/storage-blob");

// const blobClient = BlobServiceClient.fromConnectionString(
//   process.env.STORAGE_CONNECTION_STRING || ""
// );

// const container = blobClient.getContainerClient(
//   process.env.CONTAINER || ""
// );

const uploadFile = async ({
  filename,
  stream,
  containerName,
}) => {

  const defaultBufferSize = 4 * 1024 * 1024; // 4MB
  const blockBlobClient = container.getBlockBlobClient(filename);

  const readableStream =
    stream instanceof Readable ? stream : Readable.from(stream);

  const bufferSize =
    readableStream.readableLength > 0
      ? readableStream.readableLength
      : defaultBufferSize;
  const result = await blockBlobClient.uploadStream(readableStream, bufferSize);

  return {
    result,
    url: `https://${blockBlobClient.accountName}.blob.core.windows.net/${container.containerName}/${filename}`,
  };
};

const generate = () => {
  return { result: "testing" }
}

const router = express();

router.use("/", (req, _, next) => {
  req.locals = {};
  return next();
});

// Setup authorization middleware
router.use("/internal", (req, res, next) => {
  const correctApiKey = process.env.API_KEY || "";
  const apiKey = req.headers["x-api-key"] || "";

  if (!apiKey) {
    return res.sendStatus(401);
  }

  if (apiKey === correctApiKey) {
    next();
  } else {
    return res.sendStatus(403);
  }
});


router.use(express.json());

router.get("/health", (_, res) => {
  res.status(200).send("Healthy");
});

router.post(
  "/internal/bot/generate",
  async (req, res, next) => {
    try {
      const body = req.body;
      const { prompt, callerId } = body;
      if (!prompt || !callerId) {
        throw new Error("error");
      }
      const { result } = generate();

      if (!result) {
        res.sendStatus(400);
      } else {
        const chunks = [];

        const collectAndPipe = new Transform({
          transform(chunk, _, callback) {
            // Cache the chunks
            chunks.push(chunk);
            this.push(chunk);
            callback();
          },
        });

        // Load zip data into JSZip while streaming response
        result.body
          .pipe(collectAndPipe)
          .pipe(res)
          .on("finish", async () => {
            res.end();
          });
      }
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/private/app/generate",
  async (req, res, next) => {
    try {
      const body = req.body;
      const callerId = (req.locals)
        .callerId;
      const { prompt, duration } = body;

      if (!prompt || !duration) {
        throw new Error("error");
      }
      const { result } = generate();

      if (!result) {
        res.sendStatus(400);
      } else {
        const chunks = [];

        const collectAndPipe = new Transform({
          transform(chunk, _, callback) {
            // Cache the chunks
            chunks.push(chunk);
            this.push(chunk);
            callback();
          },
        });

        // Load zip data into JSZip while streaming response
        result.body
          .pipe(collectAndPipe)
          .pipe(res)
          .on("finish", async () => {
            res.end();
          });
      }
    } catch (err) {
      next(err);
    }
  }
);


router.post("/public/upload", async (req, res, next) => {
  const _rawFilename = req.query.filename;
  const _rawTarget = req.query.target;
  if (!_rawFilename || !_rawTarget) {
    throw new Error("error");
  }

  const filename = decodeURIComponent(_rawFilename.toString());
  const target = decodeURIComponent(_rawTarget.toString());
  const stream = req;

  try {
    const { url } = await uploadFile({
      filename,
      stream,
      containerName: target,
    });
    res.status(201).send({ url });
  } catch (err) {
    next(err);
  }
});

router.get("/test", (req, res) => {
  res.status(200).send({ dai: "cazzo" })
})


router.listen(process.env.PORT || 3000, () => {
  console.info(
    `🚀 Server is running on port ${process.env.PORT ? process.env.PORT : 3000}`
  );
});
