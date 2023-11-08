const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// middle ware
app.use(cors());
app.use(express.json());

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // dataBase
    const dataBase = client.db("food-For-All");
    const availableFoodCollections = dataBase.collection("available-food");
    const requestedFoodCollections = dataBase.collection("requested-food");

    // add food
    app.post("/availableFood", async (req, res) => {
      const food = req.body;
      const result = await availableFoodCollections.insertOne(food);
      res.send(result);
    });

    // available-food
    app.get("/availableFood", async (req, res) => {
      let options = {};
      if (req?.query?.quantity === "1") {
        options = {
          sort: { foodQuantity: -1 },
        };
      }
      if (req?.query?.Sort === "1") {
        options = {
          sort: { expiredDateTime: 1 },
        };
      }

      const query = { foodStatus: "available" };
      if (req?.query?.name) {
        query["foodName"] = req.query.name;
      }
      if (req?.query?.id) {
        query["_id"] = new ObjectId(req?.query?.id);
      }
      if (req?.query?.email) {
        query["donator.donatorEmail"] = req?.query?.email;
      }

      const cursor = availableFoodCollections.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/availableFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await availableFoodCollections.deleteOne(query);
      res.send(result);
    });

    app.put("/availableFood/:id", async (req, res) => {
      const id = req.params.id;
      const upDateFood = req.body;

      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const food = {
        $set: {
          foodName: upDateFood.foodName,
          foodImage: upDateFood.foodImage,
          foodQuantity: upDateFood.foodQuantity,
          pickupLocation: upDateFood.pickupLocation,
          expiredDateTime: upDateFood.expiredDateTime,
          additionalNotes: upDateFood.additionalNotes,
          donator: upDateFood.donator,
          foodStatus: req?.query?.status ? "deliverd" : req?.query?.status,
        },
      };
      const result = await availableFoodCollections.updateOne(
        query,
        food,
        options
      );
      res.send(result);
    });

    // Requested Food
    app.post("/requestedFood", async (req, res) => {
      const reqFood = req.body;
      const result = await requestedFoodCollections.insertOne(reqFood);
      res.send(result);
    });

    app.get("/requestedFood", async (req, res) => {
      let query = {};

      if (req?.query?.email) {
        query["requester.email"] = req?.query?.email;
      }
      if (req?.query?.foodId) {
        query["food._id"] = req?.query?.foodId;
      }

      const cursor = requestedFoodCollections.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/requestedFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestedFoodCollections.deleteOne(query);
      res.send(result);
    });

    app.put("/requestedFood/update", async (req, res) => {
      console.log(req?.query?.status);

      const upFood = req.body;
      const query = { _id: new ObjectId(upFood._id) };
      const options = { upsert: true };
      const food = {
        $set: {
          requester: upFood.requester,
          donationMoney: upFood.donationMoney,
          AdditionlNotes: upFood.AdditionlNotes,
          requestedDate: upFood.requestedDate,
          food: {
            _id: upFood.food._id,
            foodName: upFood.food.foodName,
            foodImage: upFood.food.foodImage,
            foodQuantity: upFood.food.foodQuantity,
            pickupLocation: upFood.food.pickupLocation,
            expiredDateTime: upFood.food.expiredDateTime,
            additionalNotes: upFood.food.additionalNotes,
            donator: upFood.donator,
            foodStatus: req?.query?.status,
          },
          donator: upFood.donator,
        },
      };
      const result = await requestedFoodCollections.updateOne(
        query,
        food,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
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
