const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require("cors");

const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin:[
    "http://localhost:5173",
    // "https://happy-homes-hub.web.app",
    // "https://happy-homes-hub.firebaseapp.com"
  ],
  credentials: true,
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bfscg0l.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("happyHomesHub").collection("users");
    const petCollection = client.db("happyHomesHub").collection("pets");
    const adoptPetCollection = client.db("happyHomesHub").collection("adoptPets");
    const donationCollection = client.db("happyHomesHub").collection("donations");
    const paymentDonationCollection = client.db("happyHomesHub").collection("paymentDonations");

    // jwt token verify

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // user api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ massage: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/users/admin/:id", verifyToken, verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: req.body.role,
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );
    app.patch("/users/admin_out/:id", verifyToken, verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: req.body.role,
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // pets api

    app.get("/pets", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    app.get("/pets/admin", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    app.get("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(filter);
      res.send(result);
    });

    app.get("/pets_by_email/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/pets", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await petCollection.insertOne(item);
      res.send(result);
    });

    app.patch("/pets/update/:id", verifyToken, async (req, res) => {
      const pet = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: pet.name,
          category: pet.category,
          age: pet.age,
          location: pet.location,
          note: pet.note,
          description: pet.description,
          image: pet.image,
          adopted: pet.adopted,
          date: pet.date,
        },
      };
      const result = await petCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/pets/adopted/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          adopted: req.body.adopted,
        },
      };
      const result = await petCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/pets/delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });

    // adopt api

    app.get("/adoptPets", async (req, res) => {
      const items= req.body;
      const result = await adoptPetCollection.find(items).toArray();
      res.send(result);
    });
    
    app.get("/adoptPets/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await adoptPetCollection.findOne(filter);
      res.send(result);
    });


    app.patch("/adoptPets_request/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          adoption: req.body.adoption,
        },
      };
      const result = await adoptPetCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post("/adoptPets", async (req, res) => {
      const adoptInfo = req.body;
      const result = await adoptPetCollection.insertOne(adoptInfo);
      res.send(result);
    });

    // create donations
    app.get("/donations", async (req, res) => {
      const result = await donationCollection.find().toArray();
      res.send(result);
    });

    app.get("/donations/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await donationCollection.findOne(filter);
      res.send(result);
    });

    app.get("/createDonation_by_email/:email",  async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await donationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/createDonation", verifyToken, async (req, res) => {
      const donationInfo = req.body;
      const result = await donationCollection.insertOne(donationInfo);
      res.send(result);
    });

    app.patch("/donations/edit/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          image: item.image,
          name: item.name,
          lastDate: item.lastDate,
          amount: item.amount,
          short_description: item.short_description,
          description: item.description,
          donation: item.donation,
          date: item.date,
        },
      };
      const result = await donationCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/createDonation_status/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          donation: req.body.donation,
        },
      };
      const result = await donationCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/donation_amount_add/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          donationAmount: req.body.addAmount,
        },
      };
      const result = await donationCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Payment api
    app.post('/create-payment-intent', async (req, res) => {
      const { totalAmount } = req.body;
      const amount = parseInt(totalAmount * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });
    // _________________________
    // get donation api

    app.get("/my_donations/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentDonationCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/donations_refund/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await paymentDonationCollection.findOne(filter);
      res.send(result);
    });


    app.patch("/donations_refund/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          amount: item.amount,
        },
      };
      const result = await paymentDonationCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // _____________________
    app.post('/paymentDonations', async(req, res)=>{
      const payment = req.body;
      const paymentResult = await paymentDonationCollection.insertOne(payment);

      res.send(paymentResult)
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Happy homes running");
});
app.listen(port, () => {
  console.log(`Happy homes running on port ${port}`);
});
