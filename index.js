const express = require("express");
const app = express();
require("dotenv").config();
// const jwt = require("jsonwebtoken");
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require("cors");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("Happy homes running");
  });
  app.listen(port, () => {
    console.log(`Happy homes running on port ${port}`);
  });