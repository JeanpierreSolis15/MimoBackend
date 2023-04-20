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

// En un módulo aparte
function getCuponesByUser(req, callback) {
  req.getConnection((err, conn) => {
    if (err) {
      return callback(err);
    } else {
      console.log(req.params.id_user);
      conn.query(
        "SELECT * FROM `coupons` WHERE IdUsuario = ? AND NOW() BETWEEN Fecha_Inicio AND Fecha_Fin",
        [req.params.id_user],
        (err, rows) => {
          if (err) {
            return callback(err);
          } else {
            callback(null, rows);
          }
        }
      );
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
                res.status(400).json({
                  success: false,
                  data: null,
                  message:
                    "Ya tienes el máximo de cupones permitidos para esta campaña",
                });
                return;
              }

              // Validar si quedan cupones disponibles para la campaña
              if (campaign.cantidadCupones <= 0) {
                console.log(
                  "Ya no quedan cupones disponibles para esta campaña"
                );
                res.status(400).json({
                  success: false,
                  data: null,
                  message: "Ya no quedan cupones disponibles para esta campaña",
                });
                return;
              }

              // Validar si la fecha actual está dentro del rango de la campaña
              if (
                fechaActual >= new Date(campaign.Fecha_Inserccion) &&
                fechaActual <= new Date(campaign.Fecha_Fin)
              ) {
                // Calcular la fecha final del cupón
                const fechaFin = new Date(fechaActual);
                fechaFin.setDate(
                  fechaActual.getDate() + campaign.diasVencimiento
                );

                // Realizar el update para restar uno a PersonasMaximas
                const queryUpdate = `UPDATE campaigns SET PersonasMaximas = PersonasMaximas - 1 WHERE IdCampaign = ${campaign.IdCampaign}`;
                conn.query(queryUpdate, (err, result) => {
                  if (err) throw err;

                  // Verificar si se actualizó correctamente el valor de PersonasMaximas
                  if (result.affectedRows !== 1) {
                    res.status(400).json({
                      success: false,
                      data: null,
                      message:
                        "No se pudo actualizar el valor de PersonasMaximas",
                    });
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
                      // res.send({ "status": "No se pudo insertar el cupón" });
                      res.status(400).json({
                        success: false,
                        data: null,
                        message: "No se pudo insertar el cupón",
                      });

                      console.log("No se pudo insertar el cupón");
                      return;
                    }
                    // res.send({ "status": "Cupón creado correctamente" });
                    res.status(200).json({
                      success: true,
                      data: { user },
                      message: "Cupón creado correctamente",
                    });

                    console.log("Cupón creado correctamente");
                  });
                });
              } else {
                // res.send({ "status": "La fecha actual no está dentro del rango de la campaña" });
                res.status(400).json({
                  success: false,
                  data: null,
                  message:
                    "La fecha actual no está dentro del rango de la campaña",
                });

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

couponsRouter.post("/consumirCupon/", (req, res) =>
  req.getConnection((err, conn) => {
    if (err) {
      return res.send(err);
    } else {
      const code = req.body.code;
      const id_user = parseInt(req.body.id_user);
      const dateFormatted = req.body.dateFormatted;
      console.log(code, id_user, dateFormatted);
      const query = `SELECT * FROM coupons 
                     WHERE CodCupon = '${code}' 
                     AND '${dateFormatted}' BETWEEN Fecha_Inicio AND Fecha_Fin`;
      console.log(query);
      conn.query(query, (err, result) => {
        if (err) {
          return res.send(err);
        }

        if (result.length === 0) {
          return res
            .status(400)
            .send({ message: "No se encontraron cupones disponibles" });
        }

        const cupon = result[0];

        if (cupon.Cantidad_Cupon <= 0) {
          return res.status(400).send({ message: "Los cupones se vencieron" });
        }

        if (cupon.IdUsuario === id_user) {
          return res
            .status(400)
            .send({
              message:
                "El usuario que creó el cupón no puede usar el mismo cupón",
            });
        }

        const queryUpdate = `UPDATE coupons 
                              SET Cantidad_Cupon = ${cupon.Cantidad_Cupon - 1} 
                              WHERE IdCupons = ${cupon.IdCupons}`;

        conn.query(queryUpdate, (err, resultUpdate) => {
          if (err) {
            return res.send(err);
          }

          return res.send({ message: "Cupon consumido exitosamente", "data":query });
        });
      });
    }
  })
);

couponsRouter.get("/listarCupones/:id_user", (req, res) =>
  req.getConnection((err, conn) => {
    if (err) {
      return res.send(err);
    } else {
      res.status(200).json({
        success: true,
        data: [
          {
            IdCupons: 3,
            CodCupon: "CUPONFIESTA123",
            IdUsuario: 368,
            Fecha_Inicio: "2023-04-15T01:52:44.000Z",
            Fecha_Fin: "2023-04-15T10:00:00.000Z",
            Cantidad_Cupon: 3,
            Cantidad_Uso: 0,
            Cantidad_Descuento: 5.0,
            Estado: 1,
          },
        ],
        message: "Lista de cupones",
      });
      // getCuponesByUser(req, (err, rows) => {
      //   if (err) {
      //     console.error(err);
      //     res.status(500).json({ error: "Error al obtener los cupones" });
      //   } else {
      //     res
      //       .status(200)
      //       .json({ success: true, data: rows, message: "Lista de cupones" });
      //   }
      // });
    }
  })
);

module.exports = {
  couponsRouter,
};
