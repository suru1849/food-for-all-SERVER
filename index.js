const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middle ware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://food-for-all-5a3e3.web.app/",
    "https://food-for-all-5a3e3.web.app",
    "https://food-for-all-5a3e3.firebaseapp.com/",
    "https://food-for-all-5a3e3.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// JWT verfiy
const verfiyToken = async (req, res, next) => {
  const token = req.cookies?.token;
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
    const requestFoodsCollections = dataBase.collection("request-foods");

    // JWT set Token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      console.log("I need JWT -> ", email);

      const token = jwt.sign(email, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "365d",
      });

      console.log("token", token);

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
        console.log("Logout successful");
      } catch (error) {
        res.status(500).send(error);
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

    // Get available Foods
    app.get("/foods", async (req, res) => {
      const { quantity, expiredate, searchItem } = req.query;
      console.log(req.query);
      let sortObj = {};
      let query = { foodStatus: "available" };

      if (quantity) {
        sortObj = { ...sortObj, foodQuantity: parseInt(quantity) };
      }
      if (expiredate && expiredate === "-1") {
        sortObj = { ...sortObj, expiredDateTime: -1 };
      }
      if (searchItem && searchItem !== " ") {
        query = { ...query, foodName: { $regex: searchItem, $options: "i" } };
      }

      const result = await foodsCollections.find(query).sort(sortObj).toArray();

      res.send(result);
    });

    // Get a single avail-able food
    app.get("/foods/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollections.findOne(query);

      res.send(result);
    });

    // Get added food by a donator
    app.get("/foods/donator/:email", verfiyToken, async (req, res) => {
      const email = req.params.email;
      const result = await foodsCollections
        .find({
          "donator.donatorEmail": email,
        })
        .toArray();

      res.send(result);
    });

    // Delete a food of a donar
    app.delete("/foods/delete/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const result = await foodsCollections.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // Update a food
    app.put("/food/update/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const food = req.body;
      const options = { upsert: true };
      const updatedFood = {
        $set: { ...food },
      };

      const result = await foodsCollections.updateOne(
        { _id: new ObjectId(id) },
        updatedFood,
        options
      );

      res.send(result);
    });

    // Update a food Status
    app.put("/food/update/status/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const options = { upsert: true };
      const updatedFood = {
        $set: {
          foodStatus: status,
        },
      };

      const result = await foodsCollections.updateOne(
        { _id: new ObjectId(id) },
        updatedFood,
        options
      );

      res.send(result);
    });

    //Save Requested foods
    app.post("/req-food", verfiyToken, async (req, res) => {
      const food = req.body;
      const result = await requestFoodsCollections.insertOne(food);

      res.send(result);
    });

    // GetFood req by email
    app.get("/req-food/:email", verfiyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "requester.email": email };
      const result = await requestFoodsCollections.find(query).toArray();

      res.send(result);
    });

    // Get a requested food by foodId
    app.get("/req-food/foodID/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const query = { "food.foodId": id };
      const result = await requestFoodsCollections.findOne(query);

      res.send(result);
    });

    // Update a requested food by foodId
    app.put("/req-food/update/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const result = await requestFoodsCollections.updateOne(
        query,
        {
          $set: {
            status: status,
          },
        },
        options
      );

      res.send(result);
    });

    // Delete req food
    app.delete("/req-food/delete/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const result = await requestFoodsCollections.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // Website Statistics
    app.get("/statictic", async (req, res) => {
      const result1 = await usersCollections.countDocuments();
      const result2 = await requestFoodsCollections
        .find({
          status: "delivered",
        })
        .count();

      res.send({ users: result1, getService: result2 });
    });

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
  res.send("Food-for-all SERVER");
});

app.listen(port, (req, res) => {
  console.log("Food-For-All is running on port: ", port);
});
