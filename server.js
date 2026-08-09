const express=require("express");
const path=require("path");
const crypto=require("crypto");
const admin=require("firebase-admin");

const app=express();
const PORT=process.env.PORT||3000;

let db=null;
try{
  const serviceAccount=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||"");
  admin.initializeApp({
    credential:admin.credential.cert(serviceAccount),
    databaseURL:process.env.FIREBASE_DATABASE_URL
  });
  db=admin.database();
  console.log("Firebase initialized");
}catch(e){ console.error("Firebase init error:",e.message); }

app.use(express.static(path.join(__dirname,"public")));

app.post("/razorpay/webhook",express.raw({type:"application/json"}),async(req,res)=>{
  try{
    const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature=req.headers["x-razorpay-signature"];
    if(!secret||!signature)return res.status(400).json({success:false,error:"Webhook secret/signature missing"});
    const expected=crypto.createHmac("sha256",secret).update(req.body).digest("hex");
    if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(String(signature))))
      return res.status(400).json({success:false,error:"Invalid webhook signature"});
    const body=JSON.parse(req.body.toString());
    if(body.event==="payment.captured"){
      const p=body.payload?.payment?.entity||{};
      if(!p.id)return res.status(400).json({success:false,error:"Payment ID missing"});
      if(!db)return res.status(500).json({success:false,error:"Firebase not initialized"});
      const ref=db.ref("payments/"+p.id);
      const old=await ref.once("value");
      if(!old.exists()) await ref.set({
        paymentId:p.id,amount:Number(p.amount||0)/100,currency:p.currency||"INR",
        status:p.status||"captured",method:p.method||"",email:p.email||"",
        contact:p.contact||"",createdAt:Date.now(),voicePlayed:false
      });
    }
    res.json({ok:true});
  }catch(e){console.error(e);res.status(500).json({success:false,error:"Webhook processing failed"});}
});

app.use(express.json());

app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.get("/payments",async(req,res)=>{
  try{
    if(!db)return res.status(500).json({success:false,error:"Firebase not initialized"});
    const snap=await db.ref("payments").once("value");
    const data=snap.val()||{};
    const payments=Object.values(data).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const total=payments.reduce((s,p)=>s+Number(p.amount||0),0);
    res.json({success:true,total:Number(total.toFixed(2)),count:payments.length,payments});
  }catch(e){res.status(500).json({success:false,error:e.message});}
});

app.post("/payments/:id/voice-played",async(req,res)=>{
  try{
    if(!db)return res.status(500).json({success:false,error:"Firebase not initialized"});
    await db.ref("payments/"+req.params.id+"/voicePlayed").set(true);
    res.json({success:true});
  }catch(e){res.status(500).json({success:false,error:e.message});}
});

app.get("/firebase-test",async(req,res)=>{
  try{
    if(!db)return res.status(500).json({success:false,message:"Firebase not initialized"});
    await db.ref("system/test").set({message:"Firebase connection successful",time:new Date().toISOString()});
    res.json({success:true,message:"Firebase Realtime Database working"});
  }catch(e){res.status(500).json({success:false,error:e.message});}
});

app.get("/health",(_,res)=>res.json({ok:true}));

app.listen(PORT,()=>console.log("Server listening on "+PORT));
