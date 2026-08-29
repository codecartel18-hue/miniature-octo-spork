/* ==========================================================================
   QUAD LOCKER — seed data
   Starter/demo rows only. This is the one file that should change when you
   wire up a real local database: replace DEMO_REPORTS with a call that
   loads your database's starter rows (or simply leave it as [] once the
   database owns all the data). Nothing else in the app reads this file
   directly — every page goes through getReports()/getUsers() in common.js,
   so that's the only place that needs to change to point at a real DB
   instead of localStorage.

   Item status uses the ITEM_STATUS_FLOW enum from js/status.js:
   REPORTED → IN_SECURE_STORAGE → MATCH_PENDING → VERIFICATION_PENDING →
   VERIFICATION_APPROVED → READY_FOR_PICKUP → RECOVERED, with an UNCLAIMED
   branch to DONATED / RETURNED_TO_FINDER / INSTITUTIONAL_PROPERTY.

   A report can carry a `claims` array — one entry per "I think this is
   mine" submission, each using the separate CLAIM_STATUS_FLOW enum. A
   report is only ever taken off the public Discover feed once one of its
   claims is active (see getUnclaimedReports in common.js), and admin can
   compare every claim on a report side by side to choose the best owner
   (see the Claims section in admin.js/admin.html).
   ========================================================================== */
const DEMO_REPORTS = [
  {id:1,name:"Casio Calculator",cat:"Electronics",location:"Engineering Lab 204",date:"2026-08-25",status:"VERIFICATION_PENDING",owner:"Riya S.",email:"", img:"https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=80",type:"found",desc:"Black calculator with a small astronomy sticker on the back.",
    // Two competing claims on the same item — this is the case the admin
    // "compare and choose the best owner" view is built for.
    claims:[
      {id:101,status:"UNDER_REVIEW",by:"Kabir M.",email:"",detail:"Astronomy sticker with a small chip on the corner",description:"It's a black Casio with a blue astronomy sticker on the back cover, near the battery slot.",matchScore:62,submittedAt:Date.now()-86400000},
      {id:102,status:"SUBMITTED",by:"Devansh R.",email:"",detail:"Small crack near the power button",description:"Black calculator, crack near the power button, don't remember any stickers on it.",matchScore:24,submittedAt:Date.now()-43200000}
    ]},
  {id:2,name:"Student ID Card",cat:"ID Cards",location:"Central Library",date:"2026-08-24",status:"REPORTED",owner:"Admin Desk",email:"", img:"https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80",type:"found",desc:"Blue lanyard, scratched plastic sleeve, initials A.K."},
  {id:3,name:"Engineering Book",cat:"Books",location:"Canteen — Table 8",date:"2026-08-22",status:"VERIFICATION_PENDING",owner:"Neha P.",email:"", img:"https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=900&q=80",type:"found",desc:"Signals & Systems, yellow highlighter marks on chapters 2 and 5.",
    claims:[{id:103,status:"MORE_INFO_REQUESTED",by:"Priya D.",email:"",detail:"Coffee stain on the back cover",description:"Signals & Systems textbook, highlighter marks throughout, my name inside the front cover.",matchScore:41,submittedAt:Date.now()-172800000}]},
  {id:4,name:"Black Backpack",cat:"Bags",location:"Main Gate",date:"2026-08-21",status:"IN_SECURE_STORAGE",owner:"Admin Desk",email:"", img:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",type:"found",desc:"Black backpack with a torn side mesh and a red keychain."},
  {id:5,name:"AirPods Case",cat:"Electronics",location:"Workshop",date:"2026-08-20",status:"MATCH_PENDING",owner:"Kabir M.",email:"", img:"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80",type:"found",desc:"White case with a tiny blue scratch beside the hinge."},
  {id:6,name:"Blue Notebook",cat:"Books",location:"Seminar Hall",date:"2026-08-18",status:"REPORTED",owner:"Admin Desk",email:"", img:"https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80",type:"lost",desc:"Blue notebook with handwritten project title on first page."},
  {id:7,name:"Silver Water Bottle",cat:"Other",location:"Sports Complex",date:"2026-08-14",status:"RECOVERED",owner:"Admin Desk",email:"", img:"https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80",type:"found",desc:"Dented silver bottle, sticker of a mountain on the side.",
    claims:[{id:104,status:"COMPLETED",by:"Arjun T.",email:"",detail:"Mountain sticker and a dent near the base",description:"Silver steel bottle, small dent near the bottom, mountain sticker on the front.",matchScore:78,submittedAt:Date.now()-604800000}]},
  {id:8,name:"Grey Umbrella",cat:"Other",location:"Bus Stop — Gate 2",date:"2026-08-05",status:"UNCLAIMED",owner:"Admin Desk",email:"", img:"https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=900&q=80",type:"found",desc:"Plain grey umbrella, bent tip, no markings."}
];
