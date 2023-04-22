const express = require("express");
const mysql = require("mysql");
const myconn = require("express-myconnection");
const app = express();
const path = require("path");
const jwt = require("jsonwebtoken");
const apiRouter = require("../controllers");
const randtoken = require("rand-token");
const cors = require("cors");
app.use(cors());
// const functions = require("firebase-functions");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../public/views"));

// middlewares running ------------------------------------
// const dbOptions = {
//   host: "geekcorporation.xyz",
//   // port:'3306',
//   user: "geekcorp_usermimo",
//   password: "xx]CC3Goc2f[",
//   database: "geekcorp_mimo",
// };

// const dbOptions = {
//   host: "localhost",
//   // port:'3306',
//   user: "root",
//   password: "",
//   database: "mimoupdate",
// };


const dbOptions = {
  host: "mysql-psinnovationsgroup2022.alwaysdata.net",
  port:'3306',
  user: "265655",
  password: "265655_pass",
  database: "psinnovationsgroup2022_mimo",
};

app.use(myconn(mysql, dbOptions, "single"));
app.use(express.json());

// server routing ------------------------------------

app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.render("index", { titulo: "titulo" });
});

// server running ------------------------------------
app.set("port", process.env.PORT || 9000);
app.listen(app.get("port"), () => {
  console.log("Servidor corriendo en el puerto", app.get("port"));
});
