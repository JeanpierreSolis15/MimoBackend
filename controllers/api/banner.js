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

bannerRouter.put("/updateLinks", (req, res) => {
  req.getConnection((err, connection) => {
    const { linkimage_popup_app,description_popup_app, linkimage_banner_principal_app } =
      req.body;

    // Actualizar el primer valor en la tabla 'anuncios_app_slider'
    connection.query(
      "UPDATE popup_anuncio_app SET linkimage = ?, description = ? WHERE id = 1",
      [linkimage_popup_app,description_popup_app],
      (error, results) => {
        if (error) {
          console.error("Error al actualizar en anuncios_app_slider: ", error);
          res.sendStatus(500);
        } else {
          // Actualizar el primer valor en la tabla 'banner_principal_app'
          connection.query(
            "UPDATE banner_principal_app SET linkimage = ? WHERE id = 1",
            [linkimage_banner_principal_app],
            (error, results) => {
              if (error) {
                console.error(
                  "Error al actualizar en banner_principal_app: ",
                  error
                );
                res.sendStatus(500);
              } else {
                console.log("Valores actualizados con éxito en ambas tablas.");
                res.sendStatus(200);
              }
            }
          );
        }
      }
    );
  });
});

bannerRouter.post('/add-image-slider', (req, res) => {
  req.getConnection((err, db) => {
    const { linkimage } = req.body;

    const sql = 'INSERT INTO anuncios_app_slider (linkimage) VALUES (?)';
    db.query(sql, [linkimage], (err, result) => {
      if (err) {
        console.error('Error al agregar el enlace de imagen:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      console.log('Enlace de imagen agregado correctamente');
      res.status(200).json({ message: 'Enlace de imagen agregado correctamente' });
    });
  });

});

bannerRouter.delete('/delete-image-slider/:id', (req, res) => {
  req.getConnection((err, db) => {
    const { id } = req.params;

    const sql = 'DELETE FROM anuncios_app_slider WHERE id = ?';
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error('Error al eliminar el registro:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
  
      if (result.affectedRows === 0) {
        console.error('No se encontró ningún registro con ese ID');
        res.status(404).json({ error: 'No se encontró ningún registro con ese ID' });
        return;
      }
  
      console.log('Registro eliminado correctamente');
      res.status(200).json({ message: 'Registro eliminado correctamente' });
    });
  })
});

module.exports = {
  bannerRouter,
};
