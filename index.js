const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// middle ware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://food-for-all-5a3e3.firebaseapp.com",
    "https://food-for-all-5a3e3.web.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// JWT verfiy
const verfiyToken = async (req, res, next) => {
  const token = req.cookies?.Token;
  console.log("Token from middle: ", token);

  if (!token) {
    return res.status(401).send({ message: "unAuthorized" });
  }
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    // err
    if (err) {
      return res.status(401).send({ message: "unAuthorized" });
    }

    // valid Token
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kapryhp.mongodb.net/?retryWrites=true&w=majority`;

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
    // dataBase
    const dataBase = client.db("food-For-All");
    const usersCollections = dataBase.collection("users");
    const foodsCollections = dataBase.collection("foods");

    // JWT set Token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      console.log("I need JWT -> ", email);

      const token = jwt.sign(email, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });

      console.log("Token", token);

      res
        .cookie("Token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "node" : "strict",
        })
        .send({ success: true });
    });

    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("Token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "node" : "strict",
          })
          .send({ success: true });
        console.log("Logout successful");
      } catch (err) {
        res.status(501).send(err);
      }
    });

    // Save user
    app.put("/users/:email", async (req, res) => {
      const currentUser = req.body;
      const email = req.params.email;
      const query = { email: email };
      const options = { upsert: true };
      const isExist = await usersCollections.findOne(query);

      if (isExist) return res.send(isExist);

      const result = await usersCollections.updateOne(
        query,
        {
          $set: { ...currentUser, timestamp: Date.now() },
        },
        options
      );

      console.log(result);

      res.send(result);
    });

    // FOOD
    // save food
    app.post("/foods/insert", verfiyToken, async (req, res) => {
      const food = req.body;
      const result = await foodsCollections.insertOne(food);

      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Food-for-all SERVER");
});

app.listen(port, (req, res) => {
  console.log("Food-For-All is running on port: ", port);
});
