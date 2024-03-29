const sharp = require('sharp');
const path = require('path');

module.exports = (req, res, next) => {
    if (!req.file) {
      return next();
    }
  
    const modifyFilename = `${
      req.file.originalname.split(" ").join("_").split(".")[0]
    }_${Date.now()}.webp`;
  
    const outputPath = path.join(__dirname, "..", "images", modifyFilename);
  
    sharp(req.file.buffer)
      .webp({ quality: 70 })
      .resize({ height: 500 })
      .toFile(outputPath, (error) => {
        if (error) {
          return res.status(500).json({ error });
        }
        req.file.filename = modifyFilename;
        req.file.path = outputPath;
        next();
      });
  };