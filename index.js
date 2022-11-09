const express = require('express')
const dotenv = require('dotenv')
var cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());
dotenv.config()

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DBV_USER}:${process.env.DB_PASSWORD}@cluster0.yzlpmea.mongodb.net/?retryWrites=true&w=majority`;

async function run() {
    try {
        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
        const serviceCollection = client.db('tripguide').collection('services');
        const ratingCollection = client.db('tripguide').collection('ratings');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ token })
        })

        //rating manage
        app.post('/addReview', verifyJWT, async (req, res) => {
            const s = req.body;
            s.created = new Date(Date.now());
            const result = await ratingCollection.insertOne(s);
            res.send(result);
        });

        app.patch('/MyReviews/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const title = req.body.title
            const comment = req.body.comment
            const rating = req.body.rating
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    title,
                    comment,
                    rating
                }
            }
            const result = await ratingCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        app.delete('/MyReviews/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ratingCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/MyReviews', verifyJWT, async (req, res) => {
            const decoded = req.decoded;

            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'unauthorized access' })
            }

            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = ratingCollection.find(query).sort({ created: -1 }, function (err, cursor) { })
            const orders = await cursor.toArray();
            res.send(orders);
        });

        //get review by service id
        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { service_id: id }
            const cursor = ratingCollection.find(query).sort({ created: -1 }, function (err, cursor) { })
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        //get services
        app.get('/services', async (req, res) => {
            const query = {}
            const limit = parseInt(req.query?.limit);
            const cursor = serviceCollection.find(query);
            if (limit > 0) {
                cursor.limit(limit);
            }
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });

        // services manage api
        app.get('/allServices', verifyJWT, async (req, res) => {
            const decoded = req.decoded;

            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'unauthorized access' })
            }

            let query = {};
            const cursor = serviceCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.post('/allServices', verifyJWT, async (req, res) => {
            const s = req.body;
            const result = await serviceCollection.insertOne(s);
            res.send(result);
        });

        app.patch('/allServices/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const image = req.body.image
            const title = req.body.title
            const description = req.body.description
            const price = req.body.price
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    image,
                    title,
                    price,
                    description
                }
            }
            const result = await serviceCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        app.delete('/allServices/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }

}

app.get('/', (req, res) => {
    res.send('Server created for assignment 11 by Mahfuz.')
})

run().catch(err => console.error(err));

app.listen(port, () => {
    console.log(`TripGuide server app listening on port ${port}`)
})