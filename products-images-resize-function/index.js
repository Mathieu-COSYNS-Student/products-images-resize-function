const Jimp = require('jimp');
const mime = require('mime-types');
const stream = require('stream');
const { BlockBlobClient } = require('@azure/storage-blob');

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

const containerName = process.env.BLOB_CONTAINER_NAME;
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

module.exports = async function (context, eventGridEvent, inputBlob) {
  const blobUrl = context.bindingData.data.url;
  const blobName = blobUrl.slice(blobUrl.lastIndexOf('/') + 1);

  const mimetype = mime.lookup(blobName);

  if (!mimetype) return;

  let jimpMimetype = '';

  switch (mimetype) {
    case 'image/png':
      jimpMimetype = Jimp.MIME_PNG;
      break;
    case 'image/jpeg':
      jimpMimetype = Jimp.MIME_JPEG;
      break;
    default:
      throw new Error('Unrecognized Mime-Type');
  }

  const IMAGE_SIZE = 400;

  Jimp.read(inputBlob).then((image) => {
    image.cover(IMAGE_SIZE, IMAGE_SIZE);

    image.getBuffer(jimpMimetype, async (err, buffer) => {
      const readStream = stream.PassThrough();
      readStream.end(buffer);

      const blobClient = new BlockBlobClient(connectionString, containerName, blobName);

      try {
        await blobClient.uploadStream(readStream, uploadOptions.bufferSize, uploadOptions.maxBuffers, {
          blobHTTPHeaders: { blobContentType: mimetype },
        });
      } catch (err) {
        context.log(err.message);
      }
    });
  });
};
