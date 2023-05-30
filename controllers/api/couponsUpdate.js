const { Router } = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const randtoken = require("rand-token");
const couponsUpdateRouter = Router();
const admin = require("firebase-admin");

var serviceAccount = require("../../mimo-3ef92-firebase-adminsdk-gschq-c7e02cf8a6.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mimo-3ef92.firebaseio.com",
});

couponsUpdateRouter.post("/campaigns", (req, res) => {
  req.getConnection((err, connection) => {
    const {
      name,
      start_date,
      end_date,
      max_coupons_per_campaign,
      max_coupons_per_user_per_campaign,
      discount,
      days_to_expire,
      max_uses_per_coupon
    } = req.body;

    // Insertar la nueva campaña en la base de datos
    connection.query(
      "INSERT INTO campaigns (name, start_date, end_date, max_coupons_per_campaign, max_coupons_per_user_per_campaign, discount, days_to_expire, max_uses_per_coupon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        start_date,
        end_date,
        max_coupons_per_campaign,
        max_coupons_per_user_per_campaign,
        discount,
        days_to_expire,
        max_uses_per_coupon
      ],
      (err, result) => {
        if (err) {
          console.error("Error al insertar la nueva campaña: " + err.stack);
          res.status(500).send("Error al insertar la nueva campaña.");
          return;
        }

        console.log(
          "Nueva campaña insertada con éxito en la base de datos con ID: " +
            result.insertId
        );
        res
          .status(201)
          .send(
            "Nueva campaña insertada con éxito en la base de datos con ID: " +
              result.insertId
          );
      }
    );
  });
});

// Eliminar una campaña por su ID
couponsUpdateRouter.delete("/campaigns/:id", (req, res) => {
  const campaignId = req.params.id;

  req.getConnection((err, connection) => {
    if (err) {
      console.error("Error al conectar con la base de datos: " + err.stack);
      res.status(500).send("Error al conectar con la base de datos.");
      return;
    }

    // Verificar si la campaña existe antes de eliminarla
    connection.query(
      "SELECT * FROM campaigns WHERE id = ?",
      [campaignId],
      (err, results) => {
        if (err) {
          console.error("Error al buscar la campaña: " + err.stack);
          res.status(500).send("Error al buscar la campaña.");
          return;
        }

        // Verificar si la campaña existe
        if (results.length === 0) {
          res.status(404).send("La campaña no existe.");
          return;
        }

        // Eliminar la campaña de la base de datos
        connection.query(
          "DELETE FROM campaigns WHERE id = ?",
          [campaignId],
          (err, result) => {
            if (err) {
              console.error("Error al eliminar la campaña: " + err.stack);
              res.status(500).send("Error al eliminar la campaña.");
              return;
            }

            console.log(
              "Campaña eliminada con éxito de la base de datos. ID: " +
                campaignId
            );
            res.status(200).send("Campaña eliminada con éxito.");
          }
        );
      }
    );
  });
});


couponsUpdateRouter.get("/getAllCampaigns", (req, res) => {
  req.getConnection((err, connection) => {
    // Insertar la nueva campaña en la base de datos
    connection.query("SELECT * FROM campaigns", (err, result) => {
      if (err) {
        console.error("Error al insertar la nueva campaña: " + err);
        res.status(500).send("ERROR AL LISTAR LAS CAMPAÑAS");
        return;
      }

      console.log("LISTAR LAS CAMPAÑAS con éxito en la base de datos");
      res.status(200).json(result);
    });
  });
});

function generateCouponCode(campaignName) {
  const maxLength = 6; // Maximum characters allowed for campaign name
  const prefix = campaignName.slice(0, maxLength).toUpperCase();
  const randomNum = Math.floor(Math.random() * 10000);
  const suffix = randomNum.toString().padStart(4, "0");
  return prefix + suffix;
}

couponsUpdateRouter.post("/coupons", (req, res) => {
  req.getConnection((err, connection) => {
    const userId = req.body.user_id;

    // Query to get active campaigns
    const campaignQuery = `
      SELECT id, name, discount, max_coupons_per_campaign, max_coupons_per_user_per_campaign, 
             total_coupons_per_campaign, start_date, end_date, days_to_expire
      FROM campaigns
      WHERE start_date <= NOW() AND end_date >= NOW()
    `;
    console.log(campaignQuery);
    connection.query(campaignQuery, (campaignErr, campaignResult) => {
      if (campaignErr) throw campaignErr;

      if (campaignResult.length === 0) {
        res.status(404).send("No se encontraron campañas activas");
        return;
      }

      const campaign = campaignResult[0];
      const campaignId = campaign.id;
      const campaignName = campaign.name
        .toUpperCase()
        .replace(/\s/g, "")
        .substring(0, 6);
      const discount = campaign.discount;
      const maxCouponsPerCampaign = campaign.max_coupons_per_campaign;
      const maxCouponsPerUserPerCampaign =
        campaign.max_coupons_per_user_per_campaign;
      const totalCouponsPerCampaign = campaign.total_coupons_per_campaign;
      const startDate = campaign.start_date;
      const endDate = campaign.end_date;
      const daysToExpire = campaign.days_to_expire;

      // Query to check user's created coupons count for this campaign
      const userCouponCountQuery = `
        SELECT COUNT(*) AS user_coupon_count
        FROM coupons
        WHERE campaign_id = ${campaignId} AND creator_user_id = ${userId}
      `;
      console.log(userCouponCountQuery);
      connection.query(
        userCouponCountQuery,
        (userCouponCountErr, userCouponCountResult) => {
          if (userCouponCountErr) throw userCouponCountErr;

          const userCouponCount = userCouponCountResult[0].user_coupon_count;

          if (userCouponCount >= maxCouponsPerUserPerCampaign) {
            res
              .status(400)
              .send(
                "El usuario ha alcanzado el número máximo de cupones para esta campaña"
              );
            return;
          }

          // Query to check campaign's created coupons count
          const campaignCouponCountQuery = `
          SELECT COUNT(*) AS campaign_coupon_count
          FROM coupons
          WHERE campaign_id = ${campaignId}
        `;
          console.log(campaignCouponCountQuery);
          connection.query(
            campaignCouponCountQuery,
            (campaignCouponCountErr, campaignCouponCountResult) => {
              if (campaignCouponCountErr) throw campaignCouponCountErr;

              const campaignCouponCount =
                campaignCouponCountResult[0].campaign_coupon_count;

              if (campaignCouponCount >= maxCouponsPerCampaign) {
                res
                  .status(400)
                  .send("La campaña ha alcanzado el número máximo de cupones");
                return;
              }

              if (
                campaign.total_coupons_per_campaign > 0 &&
                campaignCouponCount >= totalCouponsPerCampaign
              ) {
                res
                  .status(400)
                  .send(
                    "La campaña ha alcanzado el número máximo de cupones totales"
                  );
                return;
              }
              const couponCode = generateCouponCode(campaignName);
              const expirationDate = new Date();
              expirationDate.setDate(
                expirationDate.getDate() + campaign.days_to_expire
              );

              const insertQuery = `
                INSERT INTO coupons (campaign_id, user_id, code, expiration_date,creator_user_id)
                VALUES (${campaignId}, null, '${couponCode}', '${expirationDate.toISOString()}', ${userId})
              `;
              console.log(insertQuery);
              connection.query(insertQuery, (insertErr, insertResult) => {
                if (insertErr) throw insertErr;

                // Update the campaign's created coupons count
                const updateCampaignCountQuery = `
                  UPDATE campaigns SET max_coupons_per_campaign = 
                  CASE
                    WHEN max_coupons_per_campaign > 0 THEN max_coupons_per_campaign - 1
                    ELSE max_coupons_per_campaign
                  END
                  WHERE id = ${campaignId}
                `;
                console.log(updateCampaignCountQuery);
                connection.query(
                  updateCampaignCountQuery,
                  (updateErr, updateResult) => {
                    if (updateErr) throw updateErr;

                    res.status(200).json({
                      id: insertResult.insertId,
                      campaign_id: campaignId,
                      creator_user_id: userId,
                      code: couponCode,
                      discount: discount,
                      expiration_date: expirationDate.toISOString(),
                    });
                  }
                );
              });
            }
          );
        }
      );
    });
  });
});

function incrementUserPoints(connection, userId) {
  // Consulta para verificar si existe un registro para el user_id proporcionado
  const selectQuery = 'SELECT * FROM awards_points WHERE user_id = ?';
  
  connection.query(selectQuery, [userId], (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      return;
    }
    
    if (results.length === 0) {
      // No existe un registro, inserta uno nuevo con user_id y points = 1
      const insertQuery = 'INSERT INTO awards_points (user_id, points) VALUES (?, 1)';
      connection.query(insertQuery, [userId], (err, insertResult) => {
        if (err) {
          console.error('Error al insertar el registro:', err);
        } else {
          console.log('Registro insertado correctamente');
        }
      });
    } else {
      // Existe un registro, actualiza los puntos incrementando su valor en 1
      const currentPoints = results[0].points;
      const updateQuery = 'UPDATE awards_points SET points = ? WHERE user_id = ?';
      connection.query(updateQuery, [currentPoints + 1, userId], (err, updateResult) => {
        if (err) {
          console.error('Error al actualizar los puntos:', err);
        } else {
          console.log('Puntos actualizados correctamente');
        }
      });
    }
  });
}

//API DE CONSUMIR CUPON ANTES DE MOFICICACION DE QUE EL USUARIO PUEDA USAR VARIAS VECES EL CUPON 
// couponsUpdateRouter.post("/consume", (req, res) => {
//   req.getConnection((err, connection) => {
//     const { code, user_id } = req.body;
//     const getCouponQuery = `
//       SELECT * FROM coupons WHERE code = '${code}' AND used = 0
//     `;
//     console.log(getCouponQuery);
//     connection.query(getCouponQuery, (getCouponErr, getCouponResult) => {
//       if (getCouponErr) throw getCouponErr;

//       // If the coupon does not exist or has already been used, return an error
//       if (!getCouponResult.length) {
//         return res
//           .status(404)
//           .json({ message: "Cupón no encontrado o ya utilizado" });
//       }

//       // If the coupon exists and has not been used, check if it has not expired
//       const coupon = getCouponResult[0];
//       const now = new Date();
//       if (coupon.expiration_date < now) {
//         return res.status(404).json({ message: "El cupón ha caducado" });
//       }

//       // Update the coupon and decrement the campaign and user coupon limits
//       const updateCouponQuery = `
//         UPDATE coupons SET used = 1, user_id = ${user_id} WHERE id = ${coupon.id}
//       `;
//       console.log(updateCouponQuery);
//       connection.query(
//         updateCouponQuery,
//         (updateCouponErr, updateCouponResult) => {
//           if (updateCouponErr) throw updateCouponErr;

//           const updateCampaignQuery = `
//           UPDATE campaigns SET max_coupons_per_campaign = max_coupons_per_campaign - 1, 
//           max_coupons_per_user_per_campaign = max_coupons_per_user_per_campaign - 1 
//           WHERE id = ${coupon.campaign_id} AND max_coupons_per_campaign > 0 
//             AND max_coupons_per_user_per_campaign > 0
//         `;
//           console.log(updateCampaignQuery);
//           connection.query(
//             updateCampaignQuery,
//             (updateCampaignErr, updateCampaignResult) => {
//               if (updateCampaignErr) throw updateCampaignErr;

//               // Return success message

//               const getCouponQuery = `
//               SELECT coupons.id,coupons.code, campaigns.discount,coupons.creator_user_id  FROM coupons INNER JOIN campaigns ON coupons.campaign_id = campaigns.id WHERE code = '${code}'
//             `;
//               console.log(getCouponQuery);
//               connection.query(
//                 getCouponQuery,
//                 (getErrorResponse, getResultResponse) => {
//                   console.log(getResultResponse[0]);
//                   incrementUserPoints(connection,getResultResponse[0].creator_user_id);
//                   return res
//                     .status(200)
//                     .json({
//                       message: "Cupón consumido con éxito",
//                       data: getResultResponse[0],
//                     });
//                 }
//               );
//             }
//           );
//         }
//       );
//     });
//   });
// });
couponsUpdateRouter.post("/consume", (req, res) => {
  req.getConnection((err, connection) => {
    const { code, user_id } = req.body;
    const getCouponQuery = `
      SELECT * FROM coupons WHERE code = '${code}'
    `;
    console.log(getCouponQuery);
    connection.query(getCouponQuery, (getCouponErr, getCouponResult) => {
      if (getCouponErr) throw getCouponErr;

      // If the coupon does not exist or has already been used, return an error
      if (!getCouponResult.length) {
        return res
          .status(404)
          .json({ message: "Cupón no encontrado o ya utilizado" });
      }

      // If the coupon exists and has not been used, check if it has not expired
      const coupon = getCouponResult[0];
      const now = new Date();
      if (coupon.expiration_date < now) {
        return res.status(404).json({ message: "El cupón ha caducado" });
      }
      
      // Get the campaign details to check the maximum uses per coupon
      const getCampaignQuery = `
        SELECT max_uses_per_coupon FROM campaigns WHERE id = ${coupon.campaign_id}
      `;
      connection.query(getCampaignQuery, (getCampaignErr, getCampaignResult) => {
        if (getCampaignErr) throw getCampaignErr;

        // Check if the coupon has reached the maximum number of uses
        if (coupon.used_count >= getCampaignResult[0].max_uses_per_coupon) {
          return res.status(400).json({ message: "El cupón ha alcanzado el máximo número de usos" });
        }

        // Update the coupon and decrement the campaign and user coupon limits
        const updateCouponQuery = `
          UPDATE coupons SET used = 1, user_id = ${user_id}, used_count = used_count + 1 WHERE id = ${coupon.id}
        `;
        console.log(updateCouponQuery);
        connection.query(
          updateCouponQuery,
          (updateCouponErr, updateCouponResult) => {
            if (updateCouponErr) throw updateCouponErr;

            const updateCampaignQuery = `
              UPDATE campaigns 
              SET max_coupons_per_campaign = max_coupons_per_campaign - 1, 
                  max_coupons_per_user_per_campaign = max_coupons_per_user_per_campaign - 1 
              WHERE id = ${coupon.campaign_id} 
                AND max_coupons_per_campaign > 0 
                AND max_coupons_per_user_per_campaign > 0
            `;
            console.log(updateCampaignQuery);
            connection.query(
              updateCampaignQuery,
              (updateCampaignErr, updateCampaignResult) => {
                if (updateCampaignErr) throw updateCampaignErr;

                // Return success message
                const getCouponQuery = `
                  SELECT coupons.id, coupons.code, campaigns.discount, coupons.creator_user_id
                  FROM coupons
                  INNER JOIN campaigns ON coupons.campaign_id = campaigns.id
                  WHERE code = '${code}'
                `;
                console.log(getCouponQuery);
                connection.query(
                  getCouponQuery,
                  (getErrorResponse, getResultResponse) => {
                    console.log(getResultResponse[0]);
                    incrementUserPoints(connection, getResultResponse[0].creator_user_id);
                    return res
                      .status(200)
                      .json({
                        message: "Cupón consumido con éxito",
                        data: getResultResponse[0],
                      });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});

// API endpoint to get all unused coupons for a given user ID
couponsUpdateRouter.get("/coupons/:user_id", (req, res) => {
  req.getConnection((err, connection) => {
    const { user_id } = req.params;
    const getCouponsQuery = `
        SELECT c.*, ca.discount, ca.max_coupons_per_user_per_campaign
        FROM coupons c
        INNER JOIN campaigns ca ON c.campaign_id = ca.id
        WHERE c.creator_user_id =  ${user_id}
        AND c.used = 0
        AND ca.start_date <= NOW()
        AND ca.end_date >= NOW();
    `;
    console.log(getCouponsQuery);
    connection.query(getCouponsQuery, (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Ocurrió un error al obtener cupones" });
      }
      return res.json({ data: results });
    });
  });
});

couponsUpdateRouter.get("/useCoupons/:id", (req, res) => {
  const { id } = req.params;

  req.getConnection((err, connection) => {
    if (err) throw err;

    const getCouponQuery = `
    SELECT * FROM coupons WHERE creator_user_id = ${id} AND used = '1' ORDER BY created_at DESC LIMIT 1
    `;
    console.log(getCouponQuery);
    connection.query(getCouponQuery, async (getCouponErr, getCouponResult) => {
      if (getCouponErr) throw getCouponErr;
      // If no coupons were found for the user, return an empty response
      console.log(getCouponResult);
      if (!getCouponResult.length) {
        return res.status(200).json([]);
      }

      const userIds = getCouponResult.map((coupon) => coupon.user_id);
      const campaignIds = getCouponResult.map((coupon) => coupon.campaign_id);
      const creatorIds = getCouponResult.map(
        (coupon) => coupon.creator_user_id
      );
      console.log(userIds, creatorIds, campaignIds);
      if (userIds && campaignIds && creatorIds) {
        const getFirebaseData = async (userIds, creatorIds) => {
          try {
            const db = admin.firestore();
            const usersRef = db.collection("client");
            const creatorsRef = db.collection("client");
            const usersSnapshot = await usersRef
              .where("id_cliente", "in", userIds)
              .get();
            const creatorsSnapshot = await creatorsRef
              .where("id_cliente", "in", creatorIds)
              .get();
            const users = {};
            usersSnapshot.forEach((doc) => {
              users[doc.data().id_cliente] = doc.data();
            });
            const creators = {};
            creatorsSnapshot.forEach((doc) => {
              creators[doc.data().id_cliente] = doc.data();
            });
            return { users, creators };
          } catch (error) {
            console.error(error);
            return null;
          }
        };

        // Wait for user and creator data to be retrieved, then construct response
        const { users, creators } = await getFirebaseData(userIds, creatorIds);
        const campaignData = await getCampaignData(connection, campaignIds);

        const responseData = getCouponResult.map((coupon, index) => {
          return {
            coupon_id: coupon.id,
            discount: coupon.discount,
            creator: creators[coupon.creator_user_id]
              ? creators[coupon.creator_user_id].nombres
              : null,
            user: users[coupon.user_id].nombres,
            campaign: campaignData.find(
              (campaign) => campaign.id === coupon.campaign_id
            ),
          };
        });

        return res.status(200).json(responseData);
      } else {
        return res.status(404).json({ message: "Coupon no usado todavia" });
      }
      // Get user and creator data from Firebase
    });
  });
});

couponsUpdateRouter.get('/puntos/:user_id', (req, res) => {
  req.getConnection((err, connection) => {
    const userId = req.params.user_id;

    // Consulta los puntos del usuario según su user_id
    const selectQuery = 'SELECT points FROM awards_points WHERE user_id = ?';
    connection.query(selectQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error al consultar la base de datos:', err);
        res.status(500).json({ error: 'Error al consultar los puntos del usuario' });
        return;
      }
  
      if (results.length === 0) {
        res.json({ user_id: userId, points: 0 });
      } else {
        res.json({ user_id: userId, points: results[0].points });
      }
    });
  });

});

async function getCampaignData(connection, campaignIds) {
  return new Promise((resolve, reject) => {
    const getCampaignQuery = `
      SELECT * FROM campaigns WHERE id IN (${campaignIds.join(",")})
    `;
    console.log(getCampaignQuery);
    connection.query(getCampaignQuery, (getCampaignErr, getCampaignResult) => {
      if (getCampaignErr) {
        reject(getCampaignErr);
      } else {
        resolve(getCampaignResult);
      }
    });
  });
}
module.exports = {
  couponsUpdateRouter,
};
