const express = require('express');
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.SPRITE_SECRET_KEY);

app.use(express.json());
app.use(cors());





const uri = `mongodb+srv://${process.env.SECRET_USER}:${process.env.SECRET_PASS}@cluster0.rhsqxdw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
// --------------------------
    const apartmentCollection = client.db('assignment-twelve').collection('apartment');

    const usersCollection = client.db('assignment-twelve').collection('users');

    const agreementAcceptCollection = client.db('assignment-twelve').collection('agreementAccept');

    const cartApartmentCollection = client.db('assignment-twelve').collection('cartApartment');

    const couponsCollection = client.db('assignment-twelve').collection('coupons');

    const paymentCollection = client.db('assignment-twelve').collection('payment');

    // -----------------------

  // user collection here;
  
  app.post('/user', async(req, res) => {
      const userInfo = req.body;
      const query = {email: userInfo.email};
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
         return res.send({message: 'user already existing'})
      };
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
  })


   app.get('/apartment', async(req, res) => {
        const page =  parseInt(req.query.page);
        const size =  parseInt(req.query.size);
        const result = await apartmentCollection.find().skip(page * size).limit(size).toArray();
        res.send(result);
   })

   app.get('/apartment-count', async(req, res) => {
        const result = await apartmentCollection.estimatedDocumentCount();
        res.send({result});
   })

   app.post('/apartment', async(req, res) => {
       const apartmentData = req.body;
       const result = await cartApartmentCollection.insertOne(apartmentData);
       res.send(result);

   })

   app.get('/cart-apartment', async(req, res) => {

         const result = await cartApartmentCollection.find().toArray();
         res.send(result)

   })

   app.patch('/update-reject/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const updateDoc = {
          $set:{ status: 'checked'}
        }
        const result = await cartApartmentCollection.updateOne(query,updateDoc);
        res.send(result); 
   })

   app.post('/update-confirm', async(req, res) => {
         const {roomData} = req.body;
         const statusQuery = {_id: new ObjectId(roomData._id)};
         const updateDocStatus = {
             $set: { status: 'checked'}
         }

        const resultStatus = await cartApartmentCollection.updateOne(statusQuery,updateDocStatus);

        const userQuery = {email: roomData.useEmail};
        const updateRole = {
            $set: { role: 'member'}
        };

        const resultRole = await usersCollection.updateOne(userQuery, updateRole);

        delete roomData._id;
        const result = await agreementAcceptCollection.insertOne(roomData);
      
        res.send({resultStatus, resultRole, result})
   })

   app.get('/user-role/:email', async(req, res) => {
         const email = req.params.email;
         const query = {email: email};
         const result = await usersCollection.findOne(query);
         res.send(result); 
   })

   app.get('/member-data/:email', async(req, res) => {
          const email = req.params.email;
          const query = {userEmail: email};
          const result = await agreementAcceptCollection.find(query).toArray();
          res.send(result);
   })

  //  coupon adding

  app.post('/coupon-add', async(req, res) => {
       const {couponData} = req.body;
       const result = await couponsCollection.insertOne(couponData);
       res.send(result);  
  })

  app.get('/all-coupons', async(req, res) => {
        const result = await couponsCollection.find().toArray();
        res.send(result)
  })

  //  stripe function 

  app.post('/create-payment-intent', async( req, res) => {
       let {price} = req.body;
       if(price == 0){
            price = 2
         }
       const amount = parseInt(price * 100);
       const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],
  });

     res.send({
          clientSecret: paymentIntent.client_secret
     })
        

  });


  app.post('/payment', async(req, res) => {
        const paymentInfo = req.body;
        const result = await paymentCollection.insertOne(paymentInfo);
        res.send(result)
  });


  app.get('/all-payment/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await paymentCollection.find(query).toArray()    
      res.send(result)
  })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
     res.send('app is running on server');
})

app.listen(port, ()=> {
    console.log(`app is running on port ${port}`);
})