const axios = require('axios');
const sharp = require('sharp');

const generateImageWithQR = async (req, res) => {
  const { image_url, qr_code_url } = req.body;

  if (!image_url || !qr_code_url) {
    return res.status(400).json({ error: 'Missing image_url or qr_code_url' });
  }

  const setBlack = 0;
  const setWhite = 0.28;
  const controlVisibility = 160;

  try {
    const [mainImageResp, qrImageResp] = await Promise.all([
      axios.get(image_url, { responseType: 'arraybuffer' }),
      axios.get(qr_code_url, { responseType: 'arraybuffer' })
    ]);

    const mainImageBuffer = Buffer.from(mainImageResp.data);
    const qrImageBuffer = Buffer.from(qrImageResp.data);

    const statsImage = await sharp(mainImageBuffer)
      .resize(10, 10)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let totalBrightness = 0;
    const pixelCount = statsImage.info.width * statsImage.info.height;

    for (let i = 0; i < statsImage.data.length; i += 3) {
      const r = statsImage.data[i];
      const g = statsImage.data[i + 1];
      const b = statsImage.data[i + 2];
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const avgBrightness = totalBrightness / pixelCount;
    let qrAlpha = 255;

    if (avgBrightness > 220) qrAlpha = 100;
    else if (avgBrightness > 180) qrAlpha = 140;
    else if (avgBrightness > 120) qrAlpha = 180;
    else qrAlpha = 220;

    const { width, height } = await sharp(mainImageBuffer).metadata();
    const qrSize = Math.round(width * 0.7);

    const resizedQR = await sharp(qrImageBuffer)
      .resize(qrSize, qrSize)
      .ensureAlpha()
      .toBuffer();

    const { data, info } = await sharp(resizedQR)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const qrOnlyBlack = Buffer.from(data);
    for (let i = 0; i < qrOnlyBlack.length; i += 4) {
      const r = qrOnlyBlack[i];
      const g = qrOnlyBlack[i + 1];
      const b = qrOnlyBlack[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if (brightness > 240) {
        qrOnlyBlack[i + 3] = 0;
      } else {
        qrOnlyBlack[i] = setBlack;
        qrOnlyBlack[i + 1] = setBlack;
        qrOnlyBlack[i + 2] = setBlack;
        qrOnlyBlack[i + 3] = controlVisibility;
      }
    }

    const styledQR = await sharp(qrOnlyBlack, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    }).png().toBuffer();

    const whiteOverlay = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: setWhite }
      }
    }).png().toBuffer();

    const imageWithFrostedGlass = await sharp(mainImageBuffer)
      .composite([{ input: whiteOverlay, blend: 'over', opacity: 1 }])
      .png()
      .toBuffer();

    const finalImage = await sharp(imageWithFrostedGlass)
      .composite([{ input: styledQR, gravity: 'center', blend: 'over', opacity: 1 }])
      .png()
      .toBuffer();

    const base64Image = `data:image/png;base64,${finalImage.toString('base64')}`;
    res.status(200).json({
      status: 200,
      message: 'success',
      image: base64Image
    });

  } catch (err) {
    console.error('[❌ ERROR]', err.message);
    res.status(500).json({
      status: 500,
      errors: 'Image processing failed',
      message: err.message
    });
  }
};

module.exports = {
  generateImageWithQR
};
