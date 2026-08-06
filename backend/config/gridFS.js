const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

let bucket;

const getBucket = () => {
  if (!bucket) {
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "excelFiles",
    });
  }
  return bucket;
};

module.exports = getBucket;