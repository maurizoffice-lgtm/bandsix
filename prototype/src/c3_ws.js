<script>
/* ---------- WRITING: Build a Sentence (A1–C2, harder structures) ---------- */
POOL.bas = [
 {id:"bs1", ctx:"Did you enjoy the workshop yesterday?", pre:"Yes,", ans:["the speaker","explained","the methods","remarkably clearly"], post:".", extra:"clear"},
 {id:"bs2", ctx:"Where should I put these boxes?", pre:"", ans:["Could you","leave them","next to","the door"], post:"?", extra:"it"},
 {id:"bs3", ctx:"Why was the meeting cancelled?", pre:"", ans:["The manager","had to","travel","unexpectedly"], post:".", extra:"travelled"},
 {id:"bs4", ctx:"Have you chosen your thesis topic yet?", pre:"I'm still", ans:["not sure","which","of the two topics","to choose"], post:".", extra:"choosing"},
 {id:"bs5", ctx:"What did the professor ask you?", pre:"She asked", ans:["me","whether","I had","read the article"], post:".", extra:"did"},
 {id:"bs6", ctx:"Why are you taking the train today?", pre:"", ans:["My car","is being","repaired","at the garage"], post:".", extra:"repairing"},
 {id:"bs7", ctx:"Do you know where the seminar is?", pre:"I don't know", ans:["where","the seminar","is being","held"], post:".", extra:"is it"},
 {id:"bs8", ctx:"Was the exam as difficult as you expected?", pre:"", ans:["It was","not nearly","as difficult","as I had feared"], post:".", extra:"so"},
 {id:"bs9", ctx:"Why did you choose this university?", pre:"", ans:["It offers","a program","that closely matches","my interests"], post:".", extra:"match"},
 {id:"bs10", ctx:"Did the new policy work?", pre:"", ans:["Had it been","introduced","earlier,","it might have worked"], post:".", extra:"If"},
 {id:"bs11", ctx:"How was the conference?", pre:"", ans:["Rarely","have I","attended","such a well-organized event"], post:".", extra:"I have"},
 {id:"bs12", ctx:"Can you tell me what time the lab opens?", pre:"Sorry,", ans:["I have","no idea","what time","it opens"], post:".", extra:"does it"},
 {id:"bs13", ctx:"Why didn't you reply to my email?", pre:"I", ans:["would have","replied","if I had","received it"], post:".", extra:"will"},
 {id:"bs14", ctx:"Who wrote this report?", pre:"", ans:["The student","whose project","won the award","wrote it"], post:".", extra:"whom"},
 {id:"bs15", ctx:"Should we start without Jonas?", pre:"", ans:["Let's wait","until","he","arrives"], post:".", extra:"will arrive"},
 {id:"bs16", ctx:"What advice did your advisor give you?", pre:"She suggested", ans:["that I","apply","to several","programs"], post:".", extra:"to apply"},
 {id:"bs17", ctx:"Is the library open late tonight?", pre:"", ans:["Not only","is it open late,","but it also","offers free coffee"], post:".", extra:"it is"},
 {id:"bs18", ctx:"How do you feel about the move?", pre:"", ans:["I'm looking","forward","to","living in a new city"], post:".", extra:"live"},
 {id:"bs19", ctx:"Did the experiment succeed?", pre:"", ans:["The results","were","far more convincing","than we had anticipated"], post:".", extra:"most"},
 {id:"bs20", ctx:"Why is the bridge closed?", pre:"", ans:["It","is said","to have been","damaged by the storm"], post:".", extra:"saying"}
];

/* ---------- WRITING: Write an Email (7 min) ---------- */
POOL.email = [
 {id:"em1", situation:"You recently joined a university hiking club. The club organized a weekend trip, but you could not attend because of a family event. The organizer, Ms. Carter, has asked members for feedback on future trips.",
  task:"Write an email to Ms. Carter. In your email, do the following:",
  bullets:["Explain why you missed the trip.","Describe what kind of trip you would like the club to organize.","Ask a question about how to get more involved in the club."]},
 {id:"em2", situation:"You ordered a used textbook from an online store run by students at your university. When it arrived, several pages were missing and the cover was damaged. The seller's name is Tom Becker.",
  task:"Write an email to Tom. In your email, do the following:",
  bullets:["Describe the problems with the book.","Explain why you need the book soon.","Suggest a solution."]},
 {id:"em3", situation:"Your professor, Dr. Nguyen, has invited students to suggest speakers for a guest lecture next semester. You know someone working in an interesting industry who might be willing to speak.",
  task:"Write an email to Dr. Nguyen. In your email, do the following:",
  bullets:["Introduce the person you are recommending.","Explain why the topic would interest students.","Mention any practical details the professor should know."]},
 {id:"em4", situation:"You are part of a group project. One group member, Lena, has missed the last two meetings and has not responded to messages. The presentation is next week.",
  task:"Write an email to Lena. In your email, do the following:",
  bullets:["Describe the current situation of the project.","Explain why her contribution is important.","Propose a way to move forward."]}
];

/* ---------- WRITING: Academic Discussion (10 min, ≥100 words) ---------- */
POOL.disc = [
 {id:"ds1", course:"Business Management",
  prof:{name:"Dr. Alvarez", text:"This week we discussed remote work. Some companies are bringing employees back to the office full time, while others remain fully remote. In your opinion, which policy is better for a company in the long run, requiring office presence or allowing remote work? Why?"},
  posts:[{name:"Hannah", text:"I think the office is better. When people work in the same place, they share ideas spontaneously, and new employees learn much faster by watching experienced colleagues. These benefits are hard to replace with video calls."},{name:"Marcus", text:"I disagree. Remote work lets companies hire talented people from anywhere, not just from one city. It also saves employees hours of commuting, which makes them more motivated and productive."}]},
 {id:"ds2", course:"Environmental Science",
  prof:{name:"Professor Okafor", text:"Cities around the world are trying to reduce car traffic. One option is to make public transport free for everyone. Another is to invest the same money in better bike lanes and walking paths. If your city had to choose one of these, which would you support, and why?"},
  posts:[{name:"Lena", text:"Free public transport is the better choice. It helps people with low incomes the most, and it can replace many car trips, especially for longer distances where cycling is not realistic."},{name:"Jamal", text:"I would invest in bike lanes. Free buses are very expensive to run every year, while bike infrastructure is mostly a one-time investment. Cycling also improves people's health."}]},
 {id:"ds3", course:"Education",
  prof:{name:"Dr. Fischer", text:"AI tools can now write essays and solve math problems. Some universities ban them in assignments, while others teach students to use them responsibly. What should universities do, and why?"},
  posts:[{name:"Sofia", text:"Universities should allow AI tools but require students to explain their process. In our future jobs, we will use these tools anyway, so we need to learn to use them well."},{name:"Ben", text:"Banning them is necessary, at least in the first year. Students first need to build basic skills like writing and reasoning on their own, otherwise they will depend on AI completely."}]},
 {id:"ds4", course:"Economics",
  prof:{name:"Dr. Brennan", text:"Some economists argue that governments should tax sugary drinks to reduce health problems, while others say such taxes unfairly burden low-income households and limit personal choice. Should governments introduce taxes on unhealthy products? Explain your view."},
  posts:[{name:"Aisha", text:"Yes. These products create costs for the whole health system, so it's fair that the price reflects that. Several countries that introduced sugar taxes saw companies reduce sugar in their recipes."},{name:"Tom", text:"I'm against it. People with lower incomes spend a larger share of their money on food, so they pay most of the tax. Education campaigns would be a fairer way to change behavior."}]}
];

/* ---------- SPEAKING: Listen and Repeat (7 sentences, increasing length up to ~20 words) ---------- */
POOL.repeat = [
 {id:"rp1", scene:"Campus Welcome Center", desc:"You are a new student assistant. Listen to the coordinator and repeat what she says.", v:"airy",
  items:["Welcome to the campus.","The information desk is on your left.","You can collect your student card there after lunch.","Campus maps are available in several languages next to the main entrance.","If you need help with accommodation, please visit the housing office on the second floor.","Shuttle buses to the main library leave from the north parking lot every twenty minutes.","Students who have not yet registered for their courses should do so before the end of the first week of term."]},
 {id:"rp2", scene:"Science Museum Tour", desc:"You are training to be a museum guide. Listen to the experienced guide and repeat what she says.", v:"rounded",
  items:["Please stay with the group.","This gallery traces the history of flight.","The first powered airplane stayed in the air for only twelve seconds.","Photography is permitted throughout the museum, but please switch off your flash.","On your right is a full-scale model of one of the earliest weather satellites ever launched.","Visitors who would like to try the flight simulator should sign up at the desk near the exit.","The café on the ground floor offers a fifteen percent discount to anyone who presents a valid tour ticket."]},
 {id:"rp3", scene:"Hotel Reception", desc:"You are starting a summer job at a hotel. Your manager explains what to say to guests.", v:"glassy",
  items:["Good evening and welcome.","May I see your passport, please?","Your room is on the fourth floor, facing the garden.","Breakfast is served in the main restaurant from seven until half past ten.","The elevators are just behind you, between the gift shop and the conference rooms.","Please do not hesitate to contact reception if there is anything you need during your stay.","Checkout is at eleven, although we would be happy to store your luggage until your train leaves in the evening."]}
];

/* ---------- SPEAKING: Take an Interview (4 × 45 s) ---------- */
POOL.interview = [
 {id:"iv1", topic:"Study habits", v:"buttery", intro:"Thank you for participating in our research study on how university students learn. I'd like to ask you a few questions.",
  qs:["Where do you usually prefer to study, and why?","Some students like to study in groups, while others prefer to work alone. Which do you prefer, and what are the advantages?","Do you think digital devices such as phones and laptops help students learn, or do they mainly distract them? Please explain.","If you were responsible for your university, what single change would you make to help students learn more effectively, and why?"]},
 {id:"iv2", topic:"Travel and culture", v:"glassy", intro:"Hello, and thanks for joining this interview for our project on travel experiences. Let's begin.",
  qs:["Tell me about a place you have visited that you found especially interesting.","Do you prefer to travel with a detailed plan or to be spontaneous? Why?","Some people say that living abroad is the best way to understand another culture. To what extent do you agree?","How do you think tourism should change in the coming decades to become more sustainable?"]},
 {id:"iv3", topic:"Work and careers", v:"airy", intro:"Hi, thanks for your time. We're surveying students about their career plans.",
  qs:["What kind of work would you like to do after you graduate?","Is it more important to you to have a high salary or meaningful work? Explain your choice.","Some companies allow employees to work from anywhere in the world. Would that appeal to you? Why or why not?","Which skill do you think will become most valuable for workers over the next twenty years, and why?"]}
];

/* Balance answer positions for all multi-question items (deterministic) */
(function balance(){
  let n=0;
  for (const key of ['daily','acad','lconv','lann','ltalk']) for (const it of POOL[key]) for (const q of it.qs){
    const k=__h(it.id+'#'+n)%4; n++;
    if (q.o.length!==4 || q.noShuffle) continue;
    __shuf(q,k);
  }
})();

/* Mock tests: full ETS lengths (Reading 50, Listening 47, Writing 12, Speaking 11 items), upper-module difficulty */
const MOCKS = [
 {id:"A", name:"Probetest A",
  reading:{cw:["cw1","cw4","cw7"], daily:["dl1","dl3","dl4","dl5"], acad:["ac1","ac4"]},
  listening:{lcr:["lc1","lc3","lc5","lc7","lc9","lc11","lc13","lc15","lc17","lc19","lc21","lc23","lc25","lc27","lc29","lc31","lc33","lc35","lc37"], lconv:["cv1","cv3","cv5","cv7","cv9"], lann:["an1","an3","an5"], ltalk:["tk1","tk4","tk6"]},
  writing:{bas:["bs1","bs3","bs5","bs7","bs9","bs11","bs13","bs15","bs17","bs19"], email:["em1"], disc:["ds1"]},
  speaking:{repeat:["rp1"], interview:["iv1"]}},
 {id:"B", name:"Probetest B",
  reading:{cw:["cw2","cw5","cw8"], daily:["dl2","dl6","dl7","dl8"], acad:["ac2","ac3"]},
  listening:{lcr:["lc2","lc4","lc6","lc8","lc10","lc12","lc14","lc16","lc18","lc20","lc22","lc24","lc26","lc28","lc30","lc32","lc34","lc36","lc38"], lconv:["cv2","cv4","cv6","cv8","cv10"], lann:["an2","an4","an6"], ltalk:["tk2","tk3","tk5"]},
  writing:{bas:["bs2","bs4","bs6","bs8","bs10","bs12","bs14","bs16","bs18","bs20"], email:["em2"], disc:["ds2"]},
  speaking:{repeat:["rp2"], interview:["iv2"]}}
];
</script>
