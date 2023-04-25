const { Router } = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const randtoken = require("rand-token");
const bannerRouter = Router();

bannerRouter.get("/", (req, res) => {
  req.getConnection((err, connection) => {
    let banners = {};
    const sql1 = "SELECT * FROM banner_principal_app";
    const sql2 = "SELECT * FROM popup_anuncio_app";
    const sql3 = "SELECT * FROM anuncios_app_slider";

    connection.query(sql1, (err, result) => {
      if (err) {
        throw err;
      }
      banners.bannerPrincipalApp = result[0];

      connection.query(sql2, (err, result) => {
        if (err) {
          throw err;
        }
        banners.popupAnuncioApp = result[0];

        connection.query(sql3, (err, result) => {
          if (err) {
            throw err;
          }
          const anuncios = result;
          banners.anunciosAppSlider = anuncios.map((anuncio) => ({
            id: anuncio.id,
            linkimage: anuncio.linkimage,
          }));
          res.json(banners);
        });
      });
    });
  });
});

module.exports = {
  bannerRouter,
};
