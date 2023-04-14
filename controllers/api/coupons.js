const { Router } = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const randtoken = require("rand-token");
const couponsRouter = Router();

// En un módulo aparte
function getCampañas(req, callback) {
  req.getConnection((err, conn) => {
    if (err) {
      return callback(err);
    } else {
      conn.query("SELECT * FROM `campaigns`", (err, rows) => {
        if (err) {
          return callback(err);
        } else {
          callback(null, rows);
        }
      });
    }
  });
}

couponsRouter.post("/crearCupon/", (req, res) =>
  req.getConnection((err, conn) => {
    if (err) {
      return res.send(err);
    } else {
      getCampañas(req, (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Error al obtener los cupones" });
        } else {
          for (const element of rows) {
            const campaign = element;
            const fechaInicio = new Date(campaign.Fecha_Inserccion);
            const fechaFin = new Date(campaign.Fecha_Fin);
            const fechaActual = new Date();
            console.log(campaign.IdCampaign, req.body.id_user);
            // Consulta para verificar si ya existe un cupón para el usuario en la campaña
            const query = `SELECT COUNT(*) as count FROM coupons WHERE IdUsuario = ${req.body.id_user}`;
            conn.query(query, (err, result) => {
              if (err) throw err;

              const count = result[0].count;

              // Validar si el usuario ya tiene el máximo de cupones permitidos
              if (count >= campaign.PersonasMaximas) {
                res.send({ "status": "Ya tienes el máximo de cupones permitidos para esta campaña" });

                console.log(
                  "Ya tienes el máximo de cupones permitidos para esta campaña"
                );
                return;
              }

              // Validar si quedan cupones disponibles para la campaña
              if (campaign.cantidadCupones <= 0) {
                res.send({ "status": "Ya no quedan cupones disponibles para esta campaña" });
                console.log(
                  "Ya no quedan cupones disponibles para esta campaña"
                );
                return;
              }

              // Validar si la fecha actual está dentro del rango de la campaña
              if (
                fechaActual >= new Date(campaign.Fecha_Inserccion) &&
                fechaActual <= new Date(campaign.Fecha_Fin)
              ) {
                // Calcular la fecha final del cupón
                const fechaFin = new Date(fechaActual);
                fechaFin.setDate(fechaActual.getDate() + campaign.diasVencimiento);

                // Realizar el update para restar uno a PersonasMaximas
                const queryUpdate = `UPDATE campaigns SET PersonasMaximas = PersonasMaximas - 1 WHERE IdCampaign = ${campaign.IdCampaign}`;
                conn.query(queryUpdate, (err, result) => {
                  if (err) throw err;

                  // Verificar si se actualizó correctamente el valor de PersonasMaximas
                  if (result.affectedRows !== 1) {
                    res.send({ "status": "No se pudo actualizar el valor de PersonasMaximas" });

                    console.log(
                      "No se pudo actualizar el valor de PersonasMaximas"
                    );
                    return;
                  }

                  // Realizar la inserción del cupón
                  const queryInsert = `INSERT INTO coupons (IdUsuario, Fecha_Inicio, Fecha_Fin, Cantidad_Cupon, Cantidad_Uso, Estado) VALUES (${
                    req.body.id_user
                  }, '${fechaActual.toISOString().slice(0, 10)}', '${fechaFin
                    .toISOString()
                    .slice(0, 10)}', ${campaign.cantidadCupones}, 0, 1)`;
                    conn.query(queryInsert, (err, result) => {
                    if (err) throw err;

                    // Verificar si se insertó correctamente el cupón
                    if (result.affectedRows !== 1) {
                      res.send({ "status": "No se pudo insertar el cupón" });

                      console.log("No se pudo insertar el cupón");
                      return;
                    }
                    res.send({ "status": "Cupón creado correctamente" });

                    console.log("Cupón creado correctamente");
                  });
                });
              } else {
                res.send({ "status": "La fecha actual no está dentro del rango de la campaña" });

                console.log(
                  "La fecha actual no está dentro del rango de la campaña"
                );
              }
            });
          }
        }
      });
    }
  })
);

module.exports = {
  couponsRouter,
};
