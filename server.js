require("dotenv").config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const fetch = require("node-fetch")

const app = express()

app.use(express.json())
app.use(cors())

/* ---------------- DATABASE CONNECTION ---------------- */

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err))

/* ---------------- MODELS ---------------- */

const userSchema = new mongoose.Schema({
    name:String,
    email:{type:String,unique:true},
    password:String,
    favorites:[String],
    watchHistory:[String]
})

const reviewSchema = new mongoose.Schema({
    userId:String,
    movieId:String,
    rating:Number,
    review:String,
    createdAt:{type:Date,default:Date.now}
})

const User = mongoose.model("User",userSchema)
const Review = mongoose.model("Review",reviewSchema)

/* ---------------- AUTH MIDDLEWARE ---------------- */

function authMiddleware(req,res,next){

    const token=req.headers.authorization

    if(!token) return res.status(401).json({message:"No token"})

    try{

        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        req.userId=decoded.id
        next()

    }catch(err){

        res.status(401).json({message:"Invalid token"})

    }

}

/* ---------------- AUTH ROUTES ---------------- */

app.post("/api/auth/register",async(req,res)=>{

try{

    const {name,email,password}=req.body

    const hashedPassword=await bcrypt.hash(password,10)

    const user=new User({
        name,
        email,
        password:hashedPassword
    })

    await user.save()

    res.json({message:"User Registered"})

}catch(err){

    res.status(500).json(err)

}

})

app.post("/api/auth/login",async(req,res)=>{

try{

    const {email,password}=req.body

    const user=await User.findOne({email})

    if(!user) return res.status(400).json({message:"User not found"})

    const isMatch=await bcrypt.compare(password,user.password)

    if(!isMatch) return res.status(400).json({message:"Invalid password"})

    const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:"1d"})

    res.json({token})

}catch(err){

    res.status(500).json(err)

}

})

/* ---------------- MOVIE SEARCH ---------------- */

app.get("/api/movies/search",async(req,res)=>{

try{

    const title=req.query.title

    const response=await fetch(`https://www.omdbapi.com/?t=${title}&apikey=${process.env.OMDB_API_KEY}`)

    const data=await response.json()

    res.json(data)

}catch(err){

    res.status(500).json(err)

}

})

/* ---------------- RECOMMEND MOVIES ---------------- */

app.get("/api/movies/recommend/:genre",async(req,res)=>{

try{

    const genre=req.params.genre

    const genreMovies={
        action:["Avengers","Mad Max","John Wick"],
        comedy:["The Mask","Home Alone","Mr Bean"],
        drama:["Titanic","Forrest Gump","The Pursuit of Happyness"],
        scifi:["Interstellar","Inception","Avatar"]
    }

    const movies=genreMovies[genre] || []

    let results=[]

    for(let movie of movies){

        const response=await fetch(`https://www.omdbapi.com/?t=${movie}&apikey=${process.env.OMDB_API_KEY}`)

        const data=await response.json()

        results.push(data)

    }

    res.json(results)

}catch(err){

    res.status(500).json(err)

}

})

/* ---------------- TRENDING MOVIES ---------------- */

app.get("/api/movies/trending",async(req,res)=>{

try{

    const trending=["Avengers","Avatar","Inception"]

    let results=[]

    for(let movie of trending){

        const response=await fetch(`https://www.omdbapi.com/?t=${movie}&apikey=${process.env.OMDB_API_KEY}`)

        const data=await response.json()

        results.push(data)

    }

    res.json(results)

}catch(err){

    res.status(500).json(err)

}

})

/* ---------------- FAVORITES ---------------- */

app.post("/api/user/favorites",authMiddleware,async(req,res)=>{

try{

    const {movie}=req.body

    const user=await User.findById(req.userId)

    user.favorites.push(movie)

    await user.save()

    res.json(user.favorites)

}catch(err){

    res.status(500).json(err)

}

})

app.get("/api/user/favorites",authMiddleware,async(req,res)=>{

try{

    const user=await User.findById(req.userId)

    res.json(user.favorites)

}catch(err){

    res.status(500).json(err)

}

})

/* ---------------- REVIEWS ---------------- */

app.post("/api/user/review",authMiddleware,async(req,res)=>{

try{

    const {movieId,rating,review}=req.body

    const newReview=new Review({
        userId:req.userId,
        movieId,
        rating,
        review
    })

    await newReview.save()

    res.json(newReview)

}catch(err){

    res.status(500).json(err)

}

})

/* ---------------- SERVER ---------------- */

app.listen(process.env.PORT,()=>{

console.log(`Server running on http://localhost:${process.env.PORT}`)

})