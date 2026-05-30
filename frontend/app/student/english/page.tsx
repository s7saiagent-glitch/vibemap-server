'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Send, Loader2, Award, Download, X, BookOpen, Brain, CheckCircle, ChevronRight, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { englishAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

// ─── Types ───────────────────────────────────────────────────────────────────
interface VocabWord { en: string; ar: string }
interface MCQ { q: string; opts: string[]; correct: number }
interface Unit {
  titleAr: string; titleEn: string
  vocab: VocabWord[]
  grammarTitle: string; grammarExplanation: string
  readingTitle: string; readingText: string
  exercises: MCQ[]
  fillBlank: { sentence: string; answer: string; hint: string }
}
interface Level { name: string; nameAr: string; color: string; border: string; text: string; units: Unit[] }

// ─── Certificate Generator ────────────────────────────────────────────────────
function generateCertificate(userName: string, level: string, levelName: string) {
  const date = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>شهادة - ${level}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Cairo',sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
.cert{width:780px;padding:60px;border:5px solid #D4AF37;border-radius:24px;position:relative;text-align:center;background:linear-gradient(135deg,#0a0e1a,#111827);color:#E2E8F0}
.cert::before{content:'';position:absolute;inset:12px;border:1px solid #D4AF37;border-radius:18px;opacity:.3;pointer-events:none}
.logo{font-size:52px;margin-bottom:8px}.uni{font-size:20px;font-weight:900;color:#D4AF37;margin-bottom:6px}
.sub{font-size:13px;color:#9CA3AF;margin-bottom:28px}.title{font-size:30px;font-weight:900;color:#fff;margin-bottom:16px}
.issued{font-size:14px;color:#9CA3AF;margin-bottom:8px}.name{font-size:38px;font-weight:900;color:#D4AF37;display:inline-block;border-bottom:2px solid #D4AF37;padding-bottom:12px;margin-bottom:20px}
.badge{display:inline-flex;align-items:center;justify-content:center;font-size:44px;font-weight:900;color:#D4AF37;border:3px solid #D4AF37;border-radius:50%;width:100px;height:100px;margin:16px auto}
.lvl{font-size:18px;font-weight:700;margin:10px 0}.desc{font-size:13px;color:#9CA3AF;line-height:1.9;margin-bottom:28px}
.date{font-size:13px;color:#9CA3AF;border-top:1px solid #374151;padding-top:18px;margin-top:18px}.seal{font-size:60px;margin-top:14px}
@media print{body{background:#fff}}</style></head>
<body><div class="cert">
<div class="logo">🎓</div>
<div class="uni">الجامعة الافتراضية العربية</div>
<div class="sub">Arab Virtual University</div>
<div class="title">شهادة إتقان اللغة الإنجليزية</div>
<div class="issued">تُمنح هذه الشهادة لـ</div>
<div class="name">${userName}</div>
<div class="badge">${level}</div>
<div class="lvl">${levelName}</div>
<div class="desc">لإتمام جميع متطلبات مستوى ${level} — ${levelName}<br>وفق الإطار الأوروبي المرجعي المشترك للغات CEFR<br>بتفوق واجتهاد</div>
<div class="date">تاريخ الإصدار: ${date}</div>
<div class="seal">🏅</div>
</div><script>window.onload=()=>window.print()</script></body></html>`
  const win = window.open('', '_blank', 'width=900,height=720')
  if (win) { win.document.write(html); win.document.close() }
}

// ─── Course Data ──────────────────────────────────────────────────────────────
const LEVELS: Record<string, Level> = {
  A1: { name: 'Beginner', nameAr: 'مبتدئ', color: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400',
    units: [
      { titleAr: 'التحيات والتعارف', titleEn: 'Greetings & Introductions',
        vocab: [{en:'Hello',ar:'مرحبا'},{en:'Goodbye',ar:'مع السلامة'},{en:'Please',ar:'من فضلك'},{en:'Thank you',ar:'شكراً'},{en:'Name',ar:'اسم'},{en:'Country',ar:'بلد'},{en:'Age',ar:'عمر'},{en:'Nice to meet you',ar:'يسعدني لقاؤك'}],
        grammarTitle:'To Be (Present)', grammarExplanation:'We use "am/is/are" to describe people and things.\n• I am a student. (أنا طالب)\n• She is happy. (هي سعيدة)\n• They are friends. (هم أصدقاء)\nQuestion form: "Are you...?" / "Is he...?"',
        readingTitle:'A New Student', readingText:'My name is Ahmed. I am from Saudi Arabia. I am twenty years old. I am a student at the university. My teacher is kind and helpful. I am happy to be here.',
        exercises:[{q:'Choose the correct form: "She ___ a doctor."',opts:['am','is','are','be'],correct:1},{q:'What does "Goodbye" mean in Arabic?',opts:['مرحباً','شكراً','مع السلامة','من فضلك'],correct:2},{q:'"Nice to meet you" is used when:',opts:['Saying farewell','Meeting someone new','Asking for help','Saying sorry'],correct:1},{q:'Choose the correct sentence:',opts:['I are happy','He am tall','They are students','She are smart'],correct:2},{q:'How do you say "What is your name?" correctly?',opts:['What your name?','What is you name?','What is your name?','What are your name?'],correct:2}],
        fillBlank:{sentence:'My name ___ Sara and I ___ from Egypt.',answer:'is / am',hint:'use "is" and "am"'}},
      { titleAr: 'الأرقام والألوان', titleEn: 'Numbers & Colors',
        vocab: [{en:'One',ar:'واحد'},{en:'Five',ar:'خمسة'},{en:'Ten',ar:'عشرة'},{en:'Red',ar:'أحمر'},{en:'Blue',ar:'أزرق'},{en:'Green',ar:'أخضر'},{en:'Black',ar:'أسود'},{en:'White',ar:'أبيض'}],
        grammarTitle:'Adjectives Before Nouns', grammarExplanation:'In English, adjectives come BEFORE the noun:\n• A red car (سيارة حمراء)\n• Three big books (ثلاثة كتب كبيرة)\n• A beautiful blue sky (سماء زرقاء جميلة)\nUnlike Arabic, adjectives do NOT change for gender/number.',
        readingTitle:'My Classroom', readingText:'There are twenty students in my class. The walls are white and the board is black. I have two blue pens and one red notebook. My teacher writes five words on the board every day. I like my colorful classroom.',
        exercises:[{q:'How do you write "5" in English?',opts:['Four','Five','Six','Seven'],correct:1},{q:'"The red car" — where is the adjective?',opts:['After the noun','Before the noun','At the end','Not present'],correct:1},{q:'What color is the sky on a clear day?',opts:['Red','Green','Blue','Black'],correct:2},{q:'Choose the correct phrase:',opts:['Car red big','Big red car','Red car big','Car big red'],correct:1},{q:'How many fingers do humans have?',opts:['Eight','Nine','Ten','Twelve'],correct:2}],
        fillBlank:{sentence:'I have ___ books. They are ___ and green.',answer:'three / blue',hint:'number + color'}},
      { titleAr: 'العائلة والأصدقاء', titleEn: 'Family & Friends',
        vocab: [{en:'Mother',ar:'أم'},{en:'Father',ar:'أب'},{en:'Brother',ar:'أخ'},{en:'Sister',ar:'أخت'},{en:'Friend',ar:'صديق'},{en:'Grandfather',ar:'جد'},{en:'Daughter',ar:'ابنة'},{en:'Uncle',ar:'عم'}],
        grammarTitle:'Possessive Adjectives', grammarExplanation:'We use possessive adjectives to show belonging:\n• My mother (أمي) • Your brother (أخوك)\n• His sister (أخته) • Her father (أبوها)\n• Our family (عائلتنا) • Their home (بيتهم)\nThese always come before a noun.',
        readingTitle:'My Family', readingText:'I have a small family. My father is a teacher and my mother is a doctor. I have one brother and two sisters. My brother is older than me. My sisters are young and funny. We love our family very much.',
        exercises:[{q:'What is the possessive adjective for "I"?',opts:['Me','Mine','My','Myself'],correct:2},{q:'Choose the correct sentence:',opts:['Her mother are kind','His father is tall','My sister are smart','Our brothers is old'],correct:1},{q:'What is the Arabic for "grandfather"?',opts:['أب','عم','جد','أخ'],correct:2},{q:'"___ dog is friendly." (belonging to them)',opts:['My','Their','His','Her'],correct:1},{q:'A female sibling is called:',opts:['Brother','Mother','Sister','Daughter'],correct:2}],
        fillBlank:{sentence:'___ father is a doctor and ___ mother is a teacher.',answer:'My / my',hint:'possessive adjective for "I"'}},
      { titleAr: 'الطعام والشراب', titleEn: 'Food & Drinks',
        vocab: [{en:'Bread',ar:'خبز'},{en:'Water',ar:'ماء'},{en:'Rice',ar:'أرز'},{en:'Chicken',ar:'دجاج'},{en:'Milk',ar:'حليب'},{en:'Apple',ar:'تفاحة'},{en:'Coffee',ar:'قهوة'},{en:'Hungry',ar:'جائع'}],
        grammarTitle:'Countable & Uncountable Nouns', grammarExplanation:'Countable nouns can be singular or plural:\n• an apple → two apples\n• a sandwich → three sandwiches\nUncountable nouns have no plural:\n• water (NOT "waters") • rice (NOT "rices") • bread (NOT "breads")\nUse "some" for both: some water, some apples.',
        readingTitle:'Breakfast Time', readingText:'Every morning, I eat breakfast at seven o\'clock. I usually have bread, eggs, and a glass of milk. Sometimes I eat an apple or a banana. I drink coffee or tea. A good breakfast gives me energy for the day.',
        exercises:[{q:'Which is an uncountable noun?',opts:['Apple','Chair','Water','Book'],correct:2},{q:'Correct: "I want ___ rice."',opts:['a','an','some','many'],correct:2},{q:'What is "chicken" in Arabic?',opts:['أرز','دجاج','خبز','حليب'],correct:1},{q:'Choose the correct plural:',opts:['Breads','Rices','Milks','Apples'],correct:3},{q:'"I am hungry" means:',opts:['أنا مريض','أنا جائع','أنا سعيد','أنا متعب'],correct:1}],
        fillBlank:{sentence:'I drink ___ coffee and eat ___ apple every morning.',answer:'some / an',hint:'some + uncountable, an + vowel sound'}},
      { titleAr: 'الأماكن والاتجاهات', titleEn: 'Places & Directions',
        vocab: [{en:'School',ar:'مدرسة'},{en:'Hospital',ar:'مستشفى'},{en:'Street',ar:'شارع'},{en:'Left',ar:'يسار'},{en:'Right',ar:'يمين'},{en:'Straight',ar:'مباشرة'},{en:'Near',ar:'قريب'},{en:'Far',ar:'بعيد'}],
        grammarTitle:'There is / There are', grammarExplanation:'Use "there is" for singular and "there are" for plural:\n• There is a mosque near here. (هناك مسجد قريب)\n• There are two schools on this street.\n• Is there a hospital? → Yes, there is.\n• Are there any shops? → Yes, there are.',
        readingTitle:'My Neighborhood', readingText:'I live in a nice neighborhood. There is a school and a mosque near my house. There are many shops on the main street. The hospital is not far from here. There are green parks where children play. I love my neighborhood.',
        exercises:[{q:'Use: "___ a bank near here."',opts:['There are','There is','They are','It are'],correct:1},{q:'What does "left" mean in Arabic?',opts:['يمين','أمام','يسار','خلف'],correct:2},{q:'Choose correct: "Are there ___ students?"',opts:['a','an','the','any'],correct:3},{q:'"Turn right" means:',opts:['اتجه يساراً','اذهب مباشرة','اتجه يميناً','ارجع'],correct:2},{q:'What is the Arabic for "hospital"?',opts:['مدرسة','مستشفى','شارع','مسجد'],correct:1}],
        fillBlank:{sentence:'___ a bank on this street and ___ two schools near the park.',answer:'There is / there are',hint:'singular vs plural'}},
      { titleAr: 'الروتين اليومي', titleEn: 'Daily Routines',
        vocab: [{en:'Wake up',ar:'استيقظ'},{en:'Sleep',ar:'ينام'},{en:'Work',ar:'يعمل'},{en:'Study',ar:'يدرس'},{en:'Cook',ar:'يطبخ'},{en:'Exercise',ar:'يتمرن'},{en:'Morning',ar:'صباح'},{en:'Evening',ar:'مساء'}],
        grammarTitle:'Simple Present Tense', grammarExplanation:'We use the simple present for habits and routines.\n• I wake up at 6 am. (He/She/It → wakes up)\n• She studies every day. (add -s/-es for third person singular)\n• Do you work here? → Yes, I do. / No, I don\'t.\n• Does he study? → Yes, he does.',
        readingTitle:'A Typical Day', readingText:'I wake up at six o\'clock every morning. First, I pray and then eat breakfast. I go to university at eight. I study for four hours and have lunch at one o\'clock. In the evening, I exercise and read. I sleep at eleven at night.',
        exercises:[{q:'"She ___ to school every day."',opts:['go','goes','going','went'],correct:1},{q:'What does "exercise" mean in Arabic?',opts:['يدرس','يطبخ','يتمرن','ينام'],correct:2},{q:'Simple present is used for:',opts:['Past events','Future plans','Habits and routines','Wishes'],correct:2},{q:'"Do you study English?" — Correct answer:',opts:['Yes, I does','Yes, I do','Yes, he do','Yes, you do'],correct:1},{q:'"Morning" in Arabic:',opts:['مساء','ليل','صباح','ظهر'],correct:2}],
        fillBlank:{sentence:'He ___ up at 7 am and ___ breakfast before going to work.',answer:'wakes / eats',hint:'third person singular -s'}},
    ]},
  A2: { name: 'Elementary', nameAr: 'أساسي', color: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400',
    units: [
      { titleAr: 'التسوق والمال', titleEn: 'Shopping & Money',
        vocab: [{en:'Price',ar:'سعر'},{en:'Expensive',ar:'غالي'},{en:'Cheap',ar:'رخيص'},{en:'Buy',ar:'يشتري'},{en:'Sell',ar:'يبيع'},{en:'Change',ar:'فكة'},{en:'Receipt',ar:'إيصال'},{en:'Discount',ar:'خصم'}],
        grammarTitle:'How much / How many', grammarExplanation:'"How much" is used with uncountable nouns or prices:\n• How much does it cost? (كم يكلف؟)\n• How much money do you have?\n"How many" is used with countable nouns:\n• How many books did you buy?\n• How many students are there?\nNote: "How much is it?" is common for asking prices.',
        readingTitle:'At the Market', readingText:'Yesterday I went to the market to buy some vegetables. I asked the seller "How much are the tomatoes?" He said two riyals per kilo. I bought two kilos and some onions. The total was ten riyals. He gave me a receipt and I went home.',
        exercises:[{q:'"How ___ water do you want?"',opts:['many','much','some','any'],correct:1},{q:'What does "expensive" mean?',opts:['رخيص','مجاني','غالي','جديد'],correct:2},{q:'"How ___ students are in the class?"',opts:['much','many','some','the'],correct:1},{q:'Choose the correct sentence:',opts:['How many is it?','How much is it?','How many cost?','How price?'],correct:1},{q:'What is a "receipt"?',opts:['خصم','فكة','إيصال','سعر'],correct:2}],
        fillBlank:{sentence:'___ much is this shirt? It is fifty riyals. That is not too ___.',answer:'How / expensive',hint:'question word + adjective'}},
      { titleAr: 'السفر والنقل', titleEn: 'Travel & Transport',
        vocab: [{en:'Airport',ar:'مطار'},{en:'Train',ar:'قطار'},{en:'Ticket',ar:'تذكرة'},{en:'Passport',ar:'جواز سفر'},{en:'Luggage',ar:'أمتعة'},{en:'Departure',ar:'مغادرة'},{en:'Arrival',ar:'وصول'},{en:'Journey',ar:'رحلة'}],
        grammarTitle:'Past Simple Tense', grammarExplanation:'Use past simple for completed actions in the past.\nRegular verbs: add -ed: walk → walked, travel → travelled\nIrregular verbs: go → went, buy → bought, take → took\n• I travelled to Dubai last week.\n• She took the train to the city.\nNegative: did not (didn\'t) + base verb: I didn\'t go.',
        readingTitle:'My First Flight', readingText:'Last summer, I travelled to London for the first time. I arrived at the airport three hours early. I checked my luggage and waited at the gate. The flight took six hours. When I arrived, it was cold and rainy. It was an amazing journey.',
        exercises:[{q:'Past simple of "go":',opts:['goed','went','gone','goes'],correct:1},{q:'What is a "passport"?',opts:['تذكرة','جواز سفر','أمتعة','مطار'],correct:1},{q:'"I ___ to Paris last year."',opts:['travel','travels','travelled','travelling'],correct:2},{q:'Negative past: "She ___ take the bus."',opts:['not','did not','does not','is not'],correct:1},{q:'"Departure" means:',opts:['وصول','مغادرة','رحلة','قطار'],correct:1}],
        fillBlank:{sentence:'We ___ to the airport and ___ our tickets at the counter.',answer:'went / bought',hint:'irregular past tense verbs'}},
      { titleAr: 'العمل والوظائف', titleEn: 'Work & Jobs',
        vocab: [{en:'Engineer',ar:'مهندس'},{en:'Doctor',ar:'طبيب'},{en:'Teacher',ar:'معلم'},{en:'Manager',ar:'مدير'},{en:'Salary',ar:'راتب'},{en:'Office',ar:'مكتب'},{en:'Meeting',ar:'اجتماع'},{en:'Interview',ar:'مقابلة'}],
        grammarTitle:'Present Continuous', grammarExplanation:'Use present continuous for actions happening NOW or around now.\nForm: am/is/are + verb-ing\n• I am working right now.\n• She is having a meeting this week.\n• They are not coming today.\nQuestion: What are you doing?\nNote: Some verbs rarely use continuous (know, like, want).',
        readingTitle:'A Busy Workplace', readingText:'Today is very busy at the office. The manager is having an important meeting. The engineers are working on a new project. The secretary is answering phone calls. I am preparing a report for tomorrow. Everyone is working hard this week.',
        exercises:[{q:'Form of present continuous:',opts:['verb + s','did + verb','am/is/are + verb-ing','will + verb'],correct:2},{q:'"She ___ a report now."',opts:['write','writes','is writing','wrote'],correct:2},{q:'What is "salary" in Arabic?',opts:['مكتب','مدير','راتب','اجتماع'],correct:2},{q:'Which verb rarely uses continuous?',opts:['Run','Know','Work','Play'],correct:1},{q:'An "interview" is:',opts:['اجتماع','مكتب','مقابلة','راتب'],correct:2}],
        fillBlank:{sentence:'The manager ___ a meeting and the engineers ___ on the project.',answer:'is having / are working',hint:'present continuous: am/is/are + -ing'}},
      { titleAr: 'الصحة والجسم', titleEn: 'Health & Body',
        vocab: [{en:'Headache',ar:'صداع'},{en:'Medicine',ar:'دواء'},{en:'Hospital',ar:'مستشفى'},{en:'Doctor',ar:'طبيب'},{en:'Fever',ar:'حمى'},{en:'Healthy',ar:'بصحة جيدة'},{en:'Exercise',ar:'تمارين'},{en:'Rest',ar:'راحة'}],
        grammarTitle:'Modal Verb: Should', grammarExplanation:'"Should" is used to give advice or recommendations.\n• You should drink more water. (يجب عليك)\n• You shouldn\'t eat too much sugar. (لا يجب عليك)\n• Should I see a doctor? → Yes, you should.\nNote: "should" is followed by the base form of the verb. It does not change: He should go (NOT goes).',
        readingTitle:'Staying Healthy', readingText:'A healthy lifestyle is very important. You should exercise at least three times a week. You should also eat fresh vegetables and fruit every day. You shouldn\'t eat too much junk food. If you have a fever or headache, you should rest and see a doctor. Good health is a great gift.',
        exercises:[{q:'"You ___ eat more vegetables."',opts:['must to','should','should to','shall to'],correct:1},{q:'What is "fever" in Arabic?',opts:['صداع','دواء','حمى','راحة'],correct:2},{q:'Negative of should:',opts:['should not / shouldn\'t','did not should','is not should','was not should'],correct:0},{q:'"You should ___ a doctor."',opts:['sees','to see','see','seeing'],correct:2},{q:'"Rest" means:',opts:['تمارين','دواء','راحة','صحة'],correct:2}],
        fillBlank:{sentence:'You ___ get enough sleep and you ___ stay up too late.',answer:'should / shouldn\'t',hint:'should + shouldn\'t for advice'}},
      { titleAr: 'الهوايات وأوقات الفراغ', titleEn: 'Hobbies & Leisure',
        vocab: [{en:'Reading',ar:'قراءة'},{en:'Swimming',ar:'سباحة'},{en:'Painting',ar:'رسم'},{en:'Cooking',ar:'طبخ'},{en:'Gardening',ar:'بستنة'},{en:'Photography',ar:'تصوير'},{en:'Enjoy',ar:'يستمتع'},{en:'Relax',ar:'يسترخي'}],
        grammarTitle:'Like / Enjoy / Love + Gerund', grammarExplanation:'After "like", "enjoy", "love", "hate", "don\'t mind" we use verb-ing (gerund):\n• I enjoy reading books. ✓ (NOT to read)\n• She loves swimming. ✓\n• He hates cooking. ✓\nBut after "want", "would like", "plan" → use infinitive (to + verb):\n• I want to learn painting.\n• She would like to try gardening.',
        readingTitle:'My Weekend Hobbies', readingText:'I love spending my free time doing different activities. I enjoy reading novels and painting watercolors. On weekends, I usually go swimming with my friends. My sister loves gardening and cooking new recipes. We believe that hobbies help us relax and feel happy. What do you enjoy doing?',
        exercises:[{q:'"She enjoys ___ in the sea."',opts:['swim','to swim','swimming','swam'],correct:2},{q:'What is "painting" in Arabic?',opts:['سباحة','قراءة','رسم','طبخ'],correct:2},{q:'After "love" we use:',opts:['infinitive only','verb-ing or infinitive','only base verb','past tense'],correct:1},{q:'"I want ___ learn photography."',opts:['to','that','for','–'],correct:0},{q:'"Relax" means:',opts:['يعمل','يسترخي','يتعلم','يتمرن'],correct:1}],
        fillBlank:{sentence:'I enjoy ___ books and she loves ___ in the pool.',answer:'reading / swimming',hint:'gerund (-ing) after enjoy/love'}},
      { titleAr: 'الطقس والفصول', titleEn: 'Weather & Seasons',
        vocab: [{en:'Sunny',ar:'مشمس'},{en:'Cloudy',ar:'غائم'},{en:'Rainy',ar:'ممطر'},{en:'Winter',ar:'شتاء'},{en:'Summer',ar:'صيف'},{en:'Temperature',ar:'درجة الحرارة'},{en:'Storm',ar:'عاصفة'},{en:'Forecast',ar:'توقعات الطقس'}],
        grammarTitle:'Future with "going to"', grammarExplanation:'Use "going to" for plans and predictions based on evidence.\nForm: am/is/are + going to + base verb\n• I am going to wear a coat. (It\'s cold.)\n• It is going to rain. (I can see clouds.)\n• They are going to travel in summer.\nQuestion: Is it going to snow?\nDo NOT use "going to going to".',
        readingTitle:'The Four Seasons', readingText:'The four seasons are spring, summer, autumn, and winter. In summer, the weather is hot and sunny. In winter, it is cold and sometimes rainy. Spring is warm and beautiful with colorful flowers. Autumn is cool and the leaves change color. I love all the seasons for different reasons.',
        exercises:[{q:'"It ___ going to rain tomorrow."',opts:['am','is','are','be'],correct:1},{q:'What is "cloudy" in Arabic?',opts:['مشمس','ممطر','غائم','عاصفة'],correct:2},{q:'"Going to" is used for:',opts:['Habits','Past events','Plans and predictions','Wishes'],correct:2},{q:'Choose the correct form:',opts:['She is go to travel','She is going to travel','She going travel','She goes to travel'],correct:1},{q:'"Storm" in Arabic:',opts:['صيف','شتاء','عاصفة','ريح'],correct:2}],
        fillBlank:{sentence:'Look at those clouds! It ___ going to rain and I ___ going to bring my umbrella.',answer:'is / am',hint:'is/am/are + going to'}},
    ]},
  B1: { name: 'Intermediate', nameAr: 'متوسط', color: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400',
    units: [
      { titleAr: 'التكنولوجيا والتواصل', titleEn: 'Technology & Communication',
        vocab: [{en:'Application',ar:'تطبيق'},{en:'Network',ar:'شبكة'},{en:'Download',ar:'تحميل'},{en:'Password',ar:'كلمة مرور'},{en:'Device',ar:'جهاز'},{en:'Social media',ar:'وسائل التواصل'},{en:'Artificial intelligence',ar:'ذكاء اصطناعي'},{en:'Digital',ar:'رقمي'}],
        grammarTitle:'Present Perfect', grammarExplanation:'Use present perfect (have/has + past participle) to connect the past to now.\n• I have downloaded the app. (still relevant now)\n• She has worked here for five years.\n• Have you ever used AI? → Yes, I have.\nKey words: already, yet, just, ever, never, since, for.\nContrast with past simple: "I downloaded it yesterday" (specific time → past simple).',
        readingTitle:'The Digital Revolution', readingText:'Technology has changed our lives dramatically. We have developed smartphones, social media, and artificial intelligence in just a few decades. Many people have already moved their work online. Companies have invested billions in digital infrastructure. However, not everyone has benefited equally from these changes. The digital divide remains a serious challenge.',
        exercises:[{q:'"She has ___ three articles this month."',opts:['write','wrote','written','writes'],correct:2},{q:'"Have you ___ used AI tools?"',opts:['ever','yet','already','just'],correct:0},{q:'Present perfect uses:',opts:['was/were + verb','will + verb','have/has + past participle','am/is/are + -ing'],correct:2},{q:'What is "password" in Arabic?',opts:['شبكة','تطبيق','جهاز','كلمة مرور'],correct:3},{q:'Choose the correct sentence:',opts:['I have went','She has went','They have gone','He have gone'],correct:2}],
        fillBlank:{sentence:'Technology ___ transformed our lives. We ___ never seen such rapid change before.',answer:'has / have',hint:'have/has + past participle'}},
      { titleAr: 'التعليم والتعلم', titleEn: 'Education & Learning',
        vocab: [{en:'Curriculum',ar:'منهج'},{en:'Scholarship',ar:'منحة دراسية'},{en:'Lecture',ar:'محاضرة'},{en:'Research',ar:'بحث'},{en:'Graduate',ar:'خريج'},{en:'Assignment',ar:'واجب'},{en:'Critical thinking',ar:'تفكير نقدي'},{en:'Motivation',ar:'دافعية'}],
        grammarTitle:'Passive Voice (Present & Past)', grammarExplanation:'Active: The teacher explains the lesson.\nPassive: The lesson is explained by the teacher.\nPresent passive: am/is/are + past participle\nPast passive: was/were + past participle\nUse passive when the agent is unknown, unimportant, or obvious.\n• The exam was cancelled. (we don\'t know who)\n• English is taught in all schools.',
        readingTitle:'Modern Education', readingText:'Education systems have been transformed by technology. Online lectures are watched by millions of students worldwide. Assignments are submitted digitally, and feedback is given immediately. Scholarships are offered to talented students who demonstrate motivation and critical thinking. Research shows that active learning methods produce better results than passive listening. Education is considered the key to a successful future.',
        exercises:[{q:'Passive present: "The book ___ every year."',opts:['published','is published','has published','publishes'],correct:1},{q:'What is "scholarship" in Arabic?',opts:['منهج','بحث','منحة دراسية','خريج'],correct:2},{q:'Past passive: "The exam ___ yesterday."',opts:['cancelled','is cancelled','was cancelled','cancels'],correct:2},{q:'We use passive when:',opts:['Agent is important','Agent is unknown or unimportant','Only in spoken English','For future actions'],correct:1},{q:'"Critical thinking" means:',opts:['تفكير سريع','تفكير نقدي','تفكير إبداعي','تفكير رياضي'],correct:1}],
        fillBlank:{sentence:'The results ___ announced last week and certificates ___ given to the graduates.',answer:'were / were',hint:'past passive: were + past participle'}},
      { titleAr: 'البيئة والطبيعة', titleEn: 'Environment & Nature',
        vocab: [{en:'Pollution',ar:'تلوث'},{en:'Renewable energy',ar:'طاقة متجددة'},{en:'Endangered',ar:'مهدد بالانقراض'},{en:'Ecosystem',ar:'نظام بيئي'},{en:'Carbon footprint',ar:'بصمة كربونية'},{en:'Deforestation',ar:'إزالة الغابات'},{en:'Sustainable',ar:'مستدام'},{en:'Conservation',ar:'الحفاظ على البيئة'}],
        grammarTitle:'Conditional Type 1 (Real Conditional)', grammarExplanation:'Use First Conditional for real or likely future situations.\nStructure: If + present simple, will + base verb\n• If we reduce pollution, we will have cleaner air.\n• If deforestation continues, many species will disappear.\n• Unless we act now, the situation will get worse.\nNote: The "if clause" can come first or second. Use comma when if-clause comes first.',
        readingTitle:'Our Planet Needs Us', readingText:'Climate change is one of the most serious challenges facing our planet. If we do not reduce carbon emissions, global temperatures will continue to rise. Many ecosystems are already endangered due to deforestation and pollution. If governments invest in renewable energy, we will create a more sustainable future. Conservation efforts have shown positive results. Small changes in our daily habits can make a big difference.',
        exercises:[{q:'"If it rains, we ___ stay inside."',opts:['will','would','should','might'],correct:0},{q:'What is "pollution" in Arabic?',opts:['طاقة متجددة','نظام بيئي','تلوث','غابة'],correct:2},{q:'First conditional uses:',opts:['If + past, would + verb','If + present, will + verb','If + past perfect, would have','If + future, shall + verb'],correct:1},{q:'"Sustainable" means:',opts:['مضر','مؤقت','مستدام','مكلف'],correct:2},{q:'Choose the correct sentence:',opts:['If I will study, I pass','If I study, I will pass','If I studied, I will pass','If I study, I would pass'],correct:1}],
        fillBlank:{sentence:'If we ___ renewable energy, we ___ reduce our carbon footprint significantly.',answer:'use / will',hint:'If + present simple, will + base verb'}},
      { titleAr: 'الثقافة والمجتمع', titleEn: 'Culture & Society',
        vocab: [{en:'Tradition',ar:'تقليد'},{en:'Heritage',ar:'تراث'},{en:'Diversity',ar:'تنوع'},{en:'Integration',ar:'اندماج'},{en:'Globalization',ar:'عولمة'},{en:'Community',ar:'مجتمع'},{en:'Values',ar:'قيم'},{en:'Tolerance',ar:'تسامح'}],
        grammarTitle:'Relative Clauses (Who, Which, That, Where)', grammarExplanation:'Relative clauses give more information about a noun.\n• People who respect diversity build better societies. (who = for people)\n• The tradition which/that we follow is ancient. (which/that = for things)\n• The city where I grew up has changed a lot. (where = for places)\nDefining clauses: essential info (no commas)\nNon-defining clauses: extra info (use commas, no "that")\n• My father, who is a teacher, values education.',
        readingTitle:'A Diverse World', readingText:'We live in a world that is rich with cultural diversity. Traditions which have been passed down for centuries help communities maintain their identity. Globalization, which connects people across borders, has brought both opportunities and challenges. People who embrace tolerance and respect build stronger, more harmonious societies. The heritage that we preserve today is the gift we give to future generations.',
        exercises:[{q:'"The student ___ won the prize is from Jordan."',opts:['which','where','who','what'],correct:2},{q:'What is "heritage" in Arabic?',opts:['تسامح','تراث','تنوع','قيم'],correct:1},{q:'"The city ___ I was born has changed."',opts:['who','which','that','where'],correct:3},{q:'Non-defining clause uses:',opts:['that','no commas','commas + who/which','only who'],correct:2},{q:'"Tolerance" means:',opts:['عدوان','تسامح','تعصب','انفصال'],correct:1}],
        fillBlank:{sentence:'The teacher ___ taught us Arabic history ___ retired last year.',answer:'who / has',hint:'who = relative pronoun for people, present perfect'}},
      { titleAr: 'أساسيات الأعمال', titleEn: 'Business Basics',
        vocab: [{en:'Investment',ar:'استثمار'},{en:'Profit',ar:'ربح'},{en:'Budget',ar:'ميزانية'},{en:'Market',ar:'سوق'},{en:'Strategy',ar:'استراتيجية'},{en:'Revenue',ar:'إيرادات'},{en:'Customer',ar:'عميل'},{en:'Competition',ar:'منافسة'}],
        grammarTitle:'Comparative & Superlative Adjectives', grammarExplanation:'Comparative (comparing 2 things): adjective + -er OR more + adjective\n• This market is bigger than that one.\n• Our strategy is more effective than theirs.\nSuperlative (comparing 3+): the + adjective + -est OR the most + adjective\n• This is the largest investment in the region.\n• She is the most experienced manager.\nIrregular: good→better→best, bad→worse→worst',
        readingTitle:'Understanding Business', readingText:'A successful business requires careful planning and smart investment. Companies that develop the most effective strategies often achieve the highest revenue. In competitive markets, businesses must offer better products at more competitive prices than their rivals. Customer satisfaction is more important than short-term profit. The best companies invest in both their employees and their customers.',
        exercises:[{q:'"This phone is ___ than that one." (good)',opts:['gooder','more good','better','best'],correct:2},{q:'What is "investment" in Arabic?',opts:['ربح','ميزانية','استثمار','إيرادات'],correct:2},{q:'Superlative of "large":',opts:['more large','largest','the largest','most largest'],correct:2},{q:'"More effective" is used for adjectives:',opts:['Short (1 syllable)','Long (3+ syllables)','Irregular','Past tense'],correct:1},{q:'"Competition" in Arabic:',opts:['تعاون','منافسة','استراتيجية','ربح'],correct:1}],
        fillBlank:{sentence:'Our new product is ___ than the old one, and it is the ___ in the market.',answer:'better / best',hint:'comparative and superlative of "good"'}},
      { titleAr: 'الإعلام والأخبار', titleEn: 'Media & News',
        vocab: [{en:'Journalist',ar:'صحفي'},{en:'Headline',ar:'عنوان رئيسي'},{en:'Broadcast',ar:'بث'},{en:'Source',ar:'مصدر'},{en:'Opinion',ar:'رأي'},{en:'Bias',ar:'تحيز'},{en:'Credibility',ar:'مصداقية'},{en:'Investigative',ar:'استقصائي'}],
        grammarTitle:'Reported Speech (Statements)', grammarExplanation:'When reporting what someone said, tenses shift back:\n• Direct: "I am a journalist." → Reported: He said he was a journalist.\n• Direct: "The news is breaking." → Reported: She said the news was breaking.\n• Direct: "We found new evidence." → Reported: They said they had found new evidence.\nTime expressions also change: now→then, today→that day, tomorrow→the next day.',
        readingTitle:'The Power of Media', readingText:'A journalist reported that media credibility had declined significantly in recent years. She said that many people had lost trust in traditional news sources. Experts claimed that bias and misinformation were spreading through social media. The editor stated that investigative journalism remained the most powerful tool for truth. He argued that readers should always check the source before believing any headline.',
        exercises:[{q:'Direct: "I work here." Reported: She said she ___ there.',opts:['work','works','worked','will work'],correct:2},{q:'What is "headline" in Arabic?',opts:['صحفي','مصدر','عنوان رئيسي','بث'],correct:2},{q:'In reported speech, "today" becomes:',opts:['yesterday','that day','tomorrow','now'],correct:1},{q:'"Credibility" means:',opts:['تحيز','مصداقية','رأي','تحقيق'],correct:1},{q:'Direct: "We are ready." Reported: They said they ___ ready.',opts:['are','were','will be','had been'],correct:1}],
        fillBlank:{sentence:'The journalist said the story ___ true and that she ___ found strong evidence.',answer:'was / had',hint:'tense shift: is→was, found→had found'}},
    ]},
  B2: { name: 'Upper-Intermediate', nameAr: 'فوق المتوسط', color: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400',
    units: [
      { titleAr: 'قواعد متقدمة', titleEn: 'Advanced Grammar',
        vocab: [{en:'Clause',ar:'جملة فرعية'},{en:'Inversion',ar:'قلب الجملة'},{en:'Subjunctive',ar:'المضارع المنصوب'},{en:'Ellipsis',ar:'الحذف'},{en:'Discourse',ar:'خطاب'},{en:'Cohesion',ar:'تماسك'},{en:'Emphasis',ar:'تأكيد'},{en:'Register',ar:'مستوى الأسلوب'}],
        grammarTitle:'Inversion for Emphasis', grammarExplanation:'Inversion (placing auxiliary before subject) is used for emphasis and formal register.\n• Never have I seen such talent. (NOT I have never seen...)\n• Rarely does she speak in public.\n• Not only did he fail, but he also refused help.\n• Hardly had we arrived when it started raining.\nThis structure is common in formal writing, literature, and speeches.',
        readingTitle:'The Art of Emphasis in English', readingText:'Not only does mastery of grammar improve writing, but it also enhances clarity of thought. Rarely do students appreciate how inversion strengthens their arguments. Never before has the ability to communicate effectively been so important. Seldom do we realize that every grammatical choice reflects a stylistic decision. Advanced writers understand that register and cohesion are as important as vocabulary itself.',
        exercises:[{q:'"___ have I read such a powerful essay."',opts:['Ever','Never','Always','Often'],correct:1},{q:'Inversion is most common in:',opts:['Casual conversation','Formal writing and speeches','Text messages','Simple sentences'],correct:1},{q:'"Not only ___ she study, but she also teaches."',opts:['does','do','is','has'],correct:0},{q:'What is "cohesion" in Arabic?',opts:['تأكيد','مستوى الأسلوب','تماسك','خطاب'],correct:2},{q:'Choose the inverted form:',opts:['I rarely go there','Rarely I go there','Rarely do I go there','Rarely going I there'],correct:2}],
        fillBlank:{sentence:'Never ___ I seen such dedication, and rarely ___ students work so hard.',answer:'have / do',hint:'inversion: auxiliary + subject'}},
      { titleAr: 'الكتابة الأكاديمية', titleEn: 'Academic Writing',
        vocab: [{en:'Thesis statement',ar:'بيان أطروحة'},{en:'Argument',ar:'حجة'},{en:'Evidence',ar:'دليل'},{en:'Citation',ar:'استشهاد'},{en:'Abstract',ar:'ملخص'},{en:'Conclusion',ar:'خاتمة'},{en:'Coherence',ar:'اتساق'},{en:'Paraphrase',ar:'إعادة صياغة'}],
        grammarTitle:'Hedging Language in Academic Writing', grammarExplanation:'Academic writing avoids absolute claims. We use hedging to sound objective:\n• It appears that... / It seems likely that...\n• This may suggest... / This could indicate...\n• Research tends to show... / Evidence seems to support...\n• It is generally accepted that...\n• Some scholars argue that...\nHedging acknowledges uncertainty and shows academic caution.',
        readingTitle:'Writing a Strong Essay', readingText:'A strong academic essay typically begins with a clear thesis statement that outlines the main argument. Evidence should support each claim, and sources must be properly cited. It appears that students who paraphrase effectively demonstrate deeper understanding than those who merely quote. Research tends to show that coherent structure and logical flow significantly improve essay quality. The conclusion should synthesize the main points rather than simply restating them.',
        exercises:[{q:'Which is a hedging phrase?',opts:['It is definitely true','Research proves that','This may suggest that','Everyone knows that'],correct:2},{q:'What is "evidence" in Arabic?',opts:['حجة','دليل','ملخص','خاتمة'],correct:1},{q:'A "thesis statement" appears:',opts:['In the conclusion','At the beginning','In the body paragraphs','In citations'],correct:1},{q:'"Paraphrase" means:',opts:['نسخ النص','إعادة صياغة','الاستشهاد','التلخيص'],correct:1},{q:'Hedging is used to:',opts:['Sound more certain','Show academic caution','Make claims stronger','Avoid evidence'],correct:1}],
        fillBlank:{sentence:'It ___ that climate change ___ be the most pressing issue of our time.',answer:'appears / may',hint:'hedging: it appears that + may'}},
      { titleAr: 'النقاش والحوار', titleEn: 'Debate & Discussion',
        vocab: [{en:'Counterargument',ar:'حجة مضادة'},{en:'Perspective',ar:'منظور'},{en:'Rebuttal',ar:'دحض'},{en:'Stance',ar:'موقف'},{en:'Concede',ar:'يسلّم بـ'},{en:'Advocate',ar:'يدافع عن'},{en:'Impartial',ar:'محايد'},{en:'Rhetoric',ar:'بلاغة'}],
        grammarTitle:'Discourse Markers for Debate', grammarExplanation:'Use discourse markers to structure arguments clearly:\nAdding: Furthermore, Moreover, In addition, Not only this, but...\nContrasting: However, Nevertheless, On the other hand, Despite this, Yet...\nConceding: Admittedly, While it is true that..., I concede that...\nConcluding: In conclusion, To sum up, Ultimately, Therefore...\nThese markers signal logical relationships and make discourse coherent.',
        readingTitle:'The Art of Debate', readingText:'Effective debate requires more than just presenting facts; it demands skill in rhetoric and argumentation. Furthermore, a strong debater must anticipate counterarguments and prepare compelling rebuttals. However, the best debaters also concede valid points from the opposition. Admittedly, maintaining an impartial stance can be difficult when debating issues we feel strongly about. Nevertheless, intellectual honesty strengthens rather than weakens our position. Ultimately, the goal of debate is to pursue truth through reasoned discourse.',
        exercises:[{q:'Which marker introduces a contrast?',opts:['Furthermore','Moreover','However','In addition'],correct:2},{q:'What is "rebuttal" in Arabic?',opts:['موقف','دحض','منظور','بلاغة'],correct:1},{q:'"Admittedly" is used to:',opts:['Add a point','Concede a point','Conclude','Contrast'],correct:1},{q:'"Advocate" means:',opts:['ينتقد','يدافع عن','يرفض','يتجاهل'],correct:1},{q:'A "counterargument" is:',opts:['A supporting argument','An argument against your position','A conclusion','An example'],correct:1}],
        fillBlank:{sentence:'___, this approach has merits. ___, the risks clearly outweigh the benefits.',answer:'Admittedly / Nevertheless',hint:'concede first, then contrast'}},
      { titleAr: 'التواصل المهني', titleEn: 'Professional Communication',
        vocab: [{en:'Stakeholder',ar:'صاحب مصلحة'},{en:'Negotiation',ar:'تفاوض'},{en:'Agenda',ar:'جدول أعمال'},{en:'Consensus',ar:'توافق'},{en:'Deliverable',ar:'مخرجات'},{en:'Facilitate',ar:'يسهّل'},{en:'Benchmark',ar:'معيار قياسي'},{en:'Liaison',ar:'حلقة وصل'}],
        grammarTitle:'Conditional Type 2 (Hypothetical)', grammarExplanation:'Second conditional expresses hypothetical/unreal present or future.\nStructure: If + past simple, would + base verb\n• If I were the manager, I would change this policy. (I\'m not the manager)\n• If we had more resources, we could expand faster.\n• What would you do if the deadline were tomorrow?\nNote: Use "were" for all persons in formal English (not "was").',
        readingTitle:'Effective Workplace Communication', readingText:'Professional communication requires clarity, respect, and strategic thinking. If stakeholders were better informed, negotiations would proceed more smoothly. Effective meetings require a clear agenda and a skilled facilitator who can build consensus. If every team member understood the deliverables, the project would reach its benchmarks faster. Companies that invest in communication training consistently outperform those that do not. Being a good liaison between departments is an invaluable professional skill.',
        exercises:[{q:'"If I ___ the CEO, I would change the strategy."',opts:['am','was','were','be'],correct:2},{q:'Second conditional is used for:',opts:['Real future plans','Hypothetical situations','Past regrets','Certainties'],correct:1},{q:'What is "negotiation" in Arabic?',opts:['جدول أعمال','تفاوض','توافق','مخرجات'],correct:1},{q:'"If we had time, we ___ review the report."',opts:['will','would','should','must'],correct:1},{q:'"Consensus" means:',opts:['خلاف','تنافس','توافق','قرار'],correct:2}],
        fillBlank:{sentence:'If the budget ___ larger, we ___ hire more specialists and expand the team.',answer:'were / would',hint:'If + past simple (were), would + base verb'}},
      { titleAr: 'الأدب والفنون', titleEn: 'Literature & Arts',
        vocab: [{en:'Metaphor',ar:'استعارة'},{en:'Symbolism',ar:'رمزية'},{en:'Narrative',ar:'سرد'},{en:'Protagonist',ar:'شخصية رئيسية'},{en:'Theme',ar:'موضوع رئيسي'},{en:'Imagery',ar:'صور أدبية'},{en:'Plot',ar:'حبكة'},{en:'Genre',ar:'نوع أدبي'}],
        grammarTitle:'Participle Clauses for Formal Writing', grammarExplanation:'Participle clauses reduce relative clauses to make writing more concise and formal:\n• The novel, written by Dostoevsky, explores human nature.\n  (= The novel, which was written by Dostoevsky...)\n• Having read the poem, she understood its symbolism.\n  (= After she had read the poem...)\n• Seen from this perspective, the metaphor is powerful.\nPresent participle (-ing) for active; Past participle (-ed/-en) for passive.',
        readingTitle:'The Power of Storytelling', readingText:'Literature, considered one of humanity\'s oldest art forms, uses narrative to explore the human condition. Written across centuries, great novels and poems reflect the values and conflicts of their time. The protagonist, facing impossible choices, often embodies the central theme of the work. Imagery and symbolism, carefully chosen by the author, create layers of meaning beneath the surface plot. Having studied literature deeply, readers develop empathy and critical thinking that extend beyond the classroom.',
        exercises:[{q:'"___ by Shakespeare, this play is a masterpiece."',opts:['Writing','Write','Written','Wrote'],correct:2},{q:'What is "metaphor" in Arabic?',opts:['رمزية','صور أدبية','استعارة','حبكة'],correct:2},{q:'Present participle is used for:',opts:['Passive actions','Active actions','Completed past','Hypothetical'],correct:1},{q:'"Having finished the novel, she ___ the symbolism."',opts:['understand','understood','was understand','understanding'],correct:1},{q:'"Genre" means:',opts:['موضوع رئيسي','نوع أدبي','شخصية','سرد'],correct:1}],
        fillBlank:{sentence:'___ in the 19th century, the novel explores themes of identity. ___ these themes, readers gain new perspectives.',answer:'Written / Understanding',hint:'past participle (passive), present participle (active)'}},
      { titleAr: 'القضايا العالمية', titleEn: 'Global Issues',
        vocab: [{en:'Poverty',ar:'فقر'},{en:'Inequality',ar:'عدم المساواة'},{en:'Diplomacy',ar:'دبلوماسية'},{en:'Refugee',ar:'لاجئ'},{en:'Sovereignty',ar:'سيادة'},{en:'Humanitarian',ar:'إنساني'},{en:'Multilateral',ar:'متعدد الأطراف'},{en:'Geopolitics',ar:'جيوسياسة'}],
        grammarTitle:'Third Conditional (Past Regrets)', grammarExplanation:'Third conditional expresses regret about the past — things that did NOT happen.\nStructure: If + past perfect, would have + past participle\n• If we had invested earlier, we would have avoided this crisis.\n• If they had signed the agreement, the conflict would have been prevented.\n• She would not have suffered if she had received help.\nThis form cannot change the past; it expresses what MIGHT have been.',
        readingTitle:'A World in Transition', readingText:'Global challenges such as poverty, inequality, and climate change require multilateral solutions. If wealthier nations had invested more in developing economies decades ago, the current inequality gap would have been far smaller. Refugees who have fled conflict demonstrate extraordinary resilience. If early diplomacy had succeeded, many humanitarian crises would have been avoided. Geopolitics shapes sovereignty and international relations in ways that ordinary citizens rarely see. Addressing these issues demands cooperation, empathy, and bold leadership.',
        exercises:[{q:'"If they had cooperated, the crisis ___ been avoided."',opts:['would','would have','had','will have'],correct:1},{q:'Third conditional is about:',opts:['Real future','Hypothetical present','Past regrets/unreal past','Habits'],correct:2},{q:'What is "refugee" in Arabic?',opts:['دبلوماسي','لاجئ','سيادة','عدم مساواة'],correct:1},{q:'"If I had studied, I ___ passed."',opts:['would','would have','had','will'],correct:1},{q:'"Humanitarian" means:',opts:['عسكري','إنساني','اقتصادي','سياسي'],correct:1}],
        fillBlank:{sentence:'If the negotiations ___ succeeded, the conflict ___ have been resolved peacefully.',answer:'had / would',hint:'If + past perfect, would have + past participle'}},
    ]},
  C1: { name: 'Advanced', nameAr: 'متقدم', color: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400',
    units: [
      { titleAr: 'اللغة الأكاديمية', titleEn: 'Academic English',
        vocab: [{en:'Epistemology',ar:'نظرية المعرفة'},{en:'Paradigm',ar:'نموذج معرفي'},{en:'Corroborate',ar:'يعزز / يؤكد'},{en:'Nuance',ar:'دقة التعبير'},{en:'Empirical',ar:'تجريبي'},{en:'Postulate',ar:'يفترض'},{en:'Dichotomy',ar:'ثنائية / تقابل'},{en:'Iterative',ar:'تكراري'}],
        grammarTitle:'Nominalization in Academic Prose', grammarExplanation:'Nominalization converts verbs and adjectives into nouns, creating formal academic style.\nVerb → Noun: decide → decision, analyze → analysis, argue → argument\nAdjective → Noun: significant → significance, accurate → accuracy, relevant → relevance\nExamples:\n• Informal: We decided quickly. → The speed of the decision was notable.\n• Informal: She analyzed the data. → Her analysis of the data revealed patterns.\nNominalization reduces clause complexity and increases information density.',
        readingTitle:'The Nature of Academic Knowledge', readingText:'The epistemological foundations of academic inquiry rest on the systematic corroboration of hypotheses through empirical investigation. A paradigm shift occurs when accumulated evidence challenges established frameworks, forcing a re-evaluation of core assumptions. The analysis of data requires not only technical precision but also nuanced interpretation. Scholars postulate theoretical frameworks that acknowledge the inherent dichotomy between objectivity and subjectivity in research. The iterative nature of academic inquiry ensures that knowledge is continually refined and contested.',
        exercises:[{q:'"Analyze" nominalized becomes:',opts:['Analyzes','Analytical','Analysis','Analyzing'],correct:2},{q:'What is "paradigm" in Arabic?',opts:['نظرية المعرفة','نموذج معرفي','ثنائية','تجريبي'],correct:1},{q:'Nominalization is used to:',opts:['Make writing informal','Increase formality and density','Simplify sentences','Avoid nouns'],correct:1},{q:'"Empirical" means:',opts:['نظري','تخميني','تجريبي','فلسفي'],correct:2},{q:'"The significance of the result" — what is nominalized?',opts:['The','result','significance','of'],correct:2}],
        fillBlank:{sentence:'The ___ of the data led to the ___ that the original theory was flawed.',answer:'analysis / conclusion',hint:'nominalizations: analyze→analysis, conclude→conclusion'}},
      { titleAr: 'البحث والتفكير النقدي', titleEn: 'Research & Critical Thinking',
        vocab: [{en:'Hypothesis',ar:'فرضية'},{en:'Methodology',ar:'منهجية'},{en:'Variable',ar:'متغير'},{en:'Correlation',ar:'ارتباط'},{en:'Causation',ar:'سببية'},{en:'Bias',ar:'تحيز'},{en:'Peer review',ar:'تحكيم الأقران'},{en:'Replication',ar:'إعادة التجربة'}],
        grammarTitle:'Advanced Conditionals: Mixed & Inverted', grammarExplanation:'Mixed conditional: different time frames\n• If I had studied harder (past), I would be a professor now (present).\n• If she were more organized (present), she would have finished by now (past).\nInverted conditional (formal, no "if"):\n• Had I known earlier, I would have helped. (= If I had known...)\n• Were this hypothesis correct, we would need to revise everything.\n• Should you require assistance, please contact us.',
        readingTitle:'The Scientific Method', readingText:'Critical thinking underpins all rigorous research. Had scientists not questioned established theories, many paradigm-shifting discoveries would never have occurred. A well-designed methodology must control for variables and distinguish correlation from causation — a distinction often overlooked in popular science reporting. Were research not subject to peer review, the quality and integrity of published findings would be severely compromised. Should any hypothesis survive replication across multiple independent studies, it gains considerable evidential weight.',
        exercises:[{q:'"Had I known, I ___ helped." (mixed)',opts:['will have','would have','should have','had'],correct:1},{q:'Inverted conditional uses:',opts:['"if" at the start','Auxiliary before subject','Past perfect only','Would at start'],correct:1},{q:'What is "peer review" in Arabic?',opts:['فرضية','تحيز','تحكيم الأقران','متغير'],correct:2},{q:'Correlation vs causation: correlation means:',opts:['A causes B','A and B occur together','A prevents B','B causes A'],correct:1},{q:'"Should you need help, ___ contact us."',opts:['you please','please','please to','kindly to'],correct:1}],
        fillBlank:{sentence:'___ the experiment been replicated, the results ___ have been considered conclusive.',answer:'Had / would',hint:'inverted conditional: Had + subject + past participle'}},
      { titleAr: 'الكتابة المهنية', titleEn: 'Professional Writing',
        vocab: [{en:'Executive summary',ar:'ملخص تنفيذي'},{en:'Memorandum',ar:'مذكرة رسمية'},{en:'Proposal',ar:'مقترح'},{en:'Correspondence',ar:'مراسلات'},{en:'Concise',ar:'موجز'},{en:'Persuasive',ar:'مقنع'},{en:'Tone',ar:'نبرة'},{en:'Formality',ar:'رسمية'}],
        grammarTitle:'Cleft Sentences for Emphasis', grammarExplanation:'Cleft sentences highlight specific information by splitting a sentence into two clauses.\nIt-cleft: It is/was + emphasized element + that/who...\n• It was the proposal that convinced the board. (not the presentation)\n• It is clear communication that defines professional success.\nWh-cleft (pseudo-cleft): What + clause + is/was...\n• What we need is a comprehensive executive summary.\n• What distinguishes good writing is precision and tone.',
        readingTitle:'The Craft of Professional Writing', readingText:'It is precision and clarity that define effective professional writing, not complexity. What separates a compelling proposal from a mediocre one is the ability to anticipate the reader\'s concerns. It was the executive summary that persuaded the investors, not the lengthy appendices. Formal correspondence demands careful attention to tone and formality. What professionals often overlook is that concise writing requires more effort, not less. It is through deliberate practice that writing improves most significantly.',
        exercises:[{q:'"It is ___ that matters most."',opts:['what clarity','that clarity','clarity','which clarity'],correct:2},{q:'What is "proposal" in Arabic?',opts:['ملخص تنفيذي','مراسلات','مقترح','مذكرة'],correct:2},{q:'Wh-cleft: "___ we need is more time."',opts:['It is','That','What','Which'],correct:2},{q:'"Concise" means:',opts:['مطوّل','مقنع','موجز','رسمي'],correct:2},{q:'Cleft sentences are used to:',opts:['Add hedging','Emphasize specific information','Create passive voice','Form questions'],correct:1}],
        fillBlank:{sentence:'It ___ the clarity of the proposal ___ convinced the committee to approve the budget.',answer:'was / that',hint:'It was + element + that = it-cleft'}},
      { titleAr: 'الخطابة العامة', titleEn: 'Public Speaking',
        vocab: [{en:'Articulate',ar:'يعبّر بوضوح'},{en:'Audience',ar:'جمهور'},{en:'Intonation',ar:'نبرة الصوت'},{en:'Pause',ar:'توقف'},{en:'Gesture',ar:'إيماءة'},{en:'Credibility',ar:'مصداقية'},{en:'Anecdote',ar:'حكاية قصيرة'},{en:'Compelling',ar:'مقنع / جذاب'}],
        grammarTitle:'Fronting and Topicalization', grammarExplanation:'Fronting places non-subject elements at the beginning of a sentence for emphasis — common in speeches and formal writing.\n• This challenge we must face together. (object fronted)\n• Brilliant though she was, she struggled with public speaking.\n• Carefully and deliberately must every word be chosen.\n• Among his greatest qualities was his honesty.\nTopicalization is the rhetorical technique of stating the topic first, creating anticipation.',
        readingTitle:'The Art of Persuasion', readingText:'Compelling speakers share several key qualities. Articulate and confident, they capture their audience from the first sentence. Their credibility they establish through evidence, not assertion. Pauses and intonation, often neglected by inexperienced speakers, carry as much meaning as the words themselves. A well-timed anecdote can transform an abstract argument into a vivid, memorable experience. This power to move, inform, and inspire — that is the ultimate goal of public speaking.',
        exercises:[{q:'"This problem we must solve." — What is fronted?',opts:['Subject','Verb','Object','Adverb'],correct:2},{q:'What is "intonation" in Arabic?',opts:['إيماءة','توقف','نبرة الصوت','جمهور'],correct:2},{q:'"Brilliant though she was..." — this is:',opts:['Passive voice','Fronting/topicalization','Relative clause','Reported speech'],correct:1},{q:'"Anecdote" means:',opts:['بيانات إحصائية','حكاية قصيرة','حجة منطقية','خاتمة'],correct:1},{q:'Fronting is most common in:',opts:['Casual conversation','Text messages','Formal speeches and writing','Questions'],correct:2}],
        fillBlank:{sentence:'___ we need is not more data, but better communication. ___ this truth every leader must understand.',answer:'What / And',hint:'wh-cleft What + fronting And + object'}},
      { titleAr: 'القواعد المعقدة', titleEn: 'Complex Grammar',
        vocab: [{en:'Subjunctive',ar:'المضارع المنصوب'},{en:'Mood',ar:'الأسلوب النحوي'},{en:'Concord',ar:'التطابق النحوي'},{en:'Ellipsis',ar:'الحذف'},{en:'Apposition',ar:'البدل'},{en:'Anaphora',ar:'الإحالة القبلية'},{en:'Cataphora',ar:'الإحالة البعدية'},{en:'Deixis',ar:'الإشارة السياقية'}],
        grammarTitle:'The English Subjunctive Mood', grammarExplanation:'The subjunctive expresses wishes, demands, hypothetical situations.\nPresent subjunctive (base form for all persons):\n• I suggest that he be present. (NOT "is")\n• It is essential that she attend the meeting.\n• The committee recommends that the policy change.\nPast subjunctive (were for all persons):\n• If I were you, I would reconsider.\n• I wish she were here.\nThe subjunctive is preserved in formal English, legal writing, and academic prose.',
        readingTitle:'Mood in English Grammar', readingText:'The subjunctive mood, though less prevalent than in Romance languages, remains an important feature of formal English. It is imperative that every student of advanced English recognize its usage. Linguists recommend that learners be exposed to authentic academic texts where the subjunctive appears naturally. The distinction between "he is" (indicative) and "he be" (subjunctive) may appear subtle, yet it carries significant implications for register and precision. It is essential that this distinction not be dismissed as archaic.',
        exercises:[{q:'"It is essential that she ___ the policy."',opts:['follows','follow','is following','followed'],correct:1},{q:'Past subjunctive uses ___ for all persons:',opts:['was','is','were','be'],correct:2},{q:'What is "subjunctive" in Arabic?',opts:['المضارع المنصوب','الأسلوب النحوي','التطابق','الحذف'],correct:0},{q:'"I wish she ___ here with us now."',opts:['is','was','were','be'],correct:2},{q:'The subjunctive is most common in:',opts:['Casual speech','Formal/academic writing','Questions','Negatives'],correct:1}],
        fillBlank:{sentence:'The board recommends that the policy ___ revised and that all staff ___ informed immediately.',answer:'be / be',hint:'subjunctive: base form (be) for all persons after recommends that'}},
      { titleAr: 'التعابير الاصطلاحية', titleEn: 'Idiomatic English',
        vocab: [{en:'Break the ice',ar:'كسر الجمود'},{en:'Under the weather',ar:'تحت وطأة المرض'},{en:'On the fence',ar:'متردد'},{en:'Bite the bullet',ar:'يتحلى بالصبر'},{en:'Spill the beans',ar:'يكشف السر'},{en:'Hit the nail',ar:'يصيب الهدف'},{en:'Burn bridges',ar:'يقطع الجسور'},{en:'Silver lining',ar:'جانب مشرق'}],
        grammarTitle:'Lexical Chunks and Collocations', grammarExplanation:'Native-like fluency requires knowing words in their typical combinations (collocations) and multi-word units (lexical chunks).\nStrong collocations: make a decision (NOT do a decision), take responsibility, raise awareness, draw a conclusion\nIdioms function as single lexical units and cannot be understood word-by-word.\nPhrasal verbs: look into (investigate), come up with (create/invent), put up with (tolerate)\nLearning English in chunks rather than isolated words dramatically improves fluency.',
        readingTitle:'The Language of Native Speakers', readingText:'What distinguishes near-native speakers from advanced learners is often not grammar but idiomatic fluency. Native speakers rarely "do a mistake" — they "make a mistake." They don\'t "take a photo," they "snap a photo" informally. When negotiations stall, a skilled diplomat knows how to break the ice. Faced with a difficult decision, experienced leaders bite the bullet rather than sitting on the fence. The ability to recognize the silver lining in any situation reflects both linguistic and emotional sophistication.',
        exercises:[{q:'"Break the ice" means:',opts:['كسر الجمود','كسر الجليد المادي','إنهاء اجتماع','البدء بالعمل'],correct:0},{q:'Correct collocation:',opts:['Do a decision','Make a decision','Take a decision loudly','Have a decide'],correct:1},{q:'"On the fence" means:',opts:['على الجدار','متردد','غاضب','واثق'],correct:1},{q:'"Bite the bullet" means:',opts:['يأكل الرصاصة','يتحلى بالصبر','يرفض المواجهة','يكون عدوانياً'],correct:1},{q:'"Silver lining" refers to:',opts:['الغيوم الفضية','جانب مشرق في موقف صعب','نجاح كامل','نهاية سعيدة'],correct:1}],
        fillBlank:{sentence:'Despite the setbacks, there is always a ___ ___. We just need to bite the ___.',answer:'silver / lining / bullet',hint:'idioms: silver lining + bite the bullet'}},
    ]},
  C2: { name: 'Mastery', nameAr: 'إتقان تام', color: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400',
    units: [
      { titleAr: 'التواصل بمستوى الناطق الأصلي', titleEn: 'Native-Level Communication',
        vocab: [{en:'Pragmatics',ar:'التداوليات'},{en:'Implicature',ar:'المضمون الضمني'},{en:'Ellipsis',ar:'الحذف'},{en:'Hedging',ar:'التحوط اللغوي'},{en:'Presupposition',ar:'الافتراض المسبق'},{en:'Code-switching',ar:'التحويل الرمزي'},{en:'Register',ar:'المستوى الأسلوبي'},{en:'Prosody',ar:'النظم الصوتي'}],
        grammarTitle:'Pragmatic Competence: Beyond Grammar', grammarExplanation:'True C2 competence involves understanding what is communicated beyond what is literally said.\nImplicature: "It\'s getting cold in here" → implies "close the window" without stating it.\nPresupposition: "Have you stopped cheating?" presupposes the person cheated.\nPoliteness strategies: indirect requests, hedging, face-saving.\nContext-sensitivity: the same sentence can mean different things in different situations.\nC2 users navigate these layers effortlessly, switching registers as needed.',
        readingTitle:'The Limits of Language', readingText:'Language at its highest level transcends mere grammatical accuracy. Pragmatic competence — understanding implicature, presupposition, and the subtle art of face-saving — distinguishes the truly proficient speaker from the merely correct one. A native speaker processes code-switching, prosodic variation, and contextual ellipsis automatically and unconsciously. The gap between C1 and C2 is not primarily grammatical; it lies in the seamless navigation of register, the instinctive deployment of hedging strategies, and the effortless interpretation of indirect meaning. This is the summit of linguistic mastery.',
        exercises:[{q:'What is "implicature" in Arabic?',opts:['الافتراض المسبق','التداوليات','المضمون الضمني','الحذف'],correct:2},{q:'Pragmatic competence involves:',opts:['Perfect grammar only','Understanding beyond literal meaning','Vocabulary breadth','Speed of speech'],correct:1},{q:'"It\'s hot in here" as an indirect request implies:',opts:['The speaker is hot','Please open the window','The weather is warm','The room needs checking'],correct:1},{q:'"Have you stopped arguing?" presupposes:',opts:['The person will argue','The person argued before','Arguing is wrong','The person may argue'],correct:1},{q:'C2 level differs from C1 mainly in:',opts:['Grammar accuracy','Vocabulary size','Pragmatic fluency and register','Pronunciation'],correct:2}],
        fillBlank:{sentence:'At C2 level, communication goes beyond ___ accuracy to encompass ___ competence.',answer:'grammatical / pragmatic',hint:'the two levels of language mastery'}},
      { titleAr: 'الأدب والبلاغة', titleEn: 'Literature & Rhetoric',
        vocab: [{en:'Irony',ar:'سخرية'},{en:'Allusion',ar:'تلميح أدبي'},{en:'Anachronism',ar:'مفارقة زمنية'},{en:'Catharsis',ar:'تطهير نفسي'},{en:'Soliloquy',ar:'مناجاة'},{en:'Leitmotif',ar:'الموتيف المتكرر'},{en:'Verisimilitude',ar:'مصداقية أدبية'},{en:'Ekphrasis',ar:'الوصف التصويري'}],
        grammarTitle:'Stylistic Devices and Their Rhetorical Functions', grammarExplanation:'Mastery of rhetoric requires recognizing how stylistic choices create meaning:\nAnaphora: repetition at the start of successive clauses for emphasis.\n "We shall fight on the beaches, we shall fight on the landing grounds..."\nAntithesis: contrasting ideas in parallel structure.\n "It was the best of times, it was the worst of times."\nZeugma: one verb applies to multiple objects with different meanings.\n "She left in anger and a taxi."\nChiasmus: reversed grammatical structures.\n "Ask not what your country can do for you..."',
        readingTitle:'Shakespeare and the Art of Language', readingText:'Shakespeare\'s genius lay not merely in plot construction but in his mastery of rhetoric and poetic language. His soliloquies achieve catharsis through the audience\'s identification with the protagonist\'s inner conflict. His allusions to classical mythology carry layers of meaning for the educated reader, while his irony operates on multiple levels simultaneously. The leitmotif of appearance versus reality runs through many of his greatest works, achieving a verisimilitude that transcends its historical anachronisms. His language, studied five centuries later, retains its power to move, disturb, and illuminate.',
        exercises:[{q:'What is "catharsis" in Arabic?',opts:['مناجاة','سخرية','تطهير نفسي','تلميح أدبي'],correct:2},{q:'Anaphora is the repetition of:',opts:['End words','Beginning words/phrases','Sounds','Verbs'],correct:1},{q:'"The best of times, the worst of times" is:',opts:['Zeugma','Irony','Antithesis','Allusion'],correct:2},{q:'"Soliloquy" means:',opts:['حوار بين شخصين','مناجاة','خطاب عام','رسالة'],correct:1},{q:'Chiasmus reverses:',opts:['Word meanings','Grammatical structures','Pronunciation','Narrative order'],correct:1}],
        fillBlank:{sentence:'"Ask not what your country can do for ___, ask what you can do for your ___." — This is chiasmus.',answer:'you / country',hint:'chiasmus: reversed grammatical parallel (you/country → country/you)'}},
      { titleAr: 'الخطاب الأكاديمي', titleEn: 'Academic Discourse',
        vocab: [{en:'Epistemology',ar:'نظرية المعرفة'},{en:'Ontology',ar:'علم الوجود'},{en:'Hegemony',ar:'هيمنة'},{en:'Discourse analysis',ar:'تحليل الخطاب'},{en:'Intertextuality',ar:'التناص'},{en:'Deconstruction',ar:'التفكيك'},{en:'Hermeneutics',ar:'التأويل'},{en:'Praxis',ar:'الممارسة التطبيقية'}],
        grammarTitle:'The Grammar of Academic Argumentation', grammarExplanation:'C2 academic writing deploys complex syntactic patterns:\nNominal clauses as subjects: "That this approach fails is evident."\nAbsolute constructions: "The data analyzed, the team drew their conclusions."\nMultiple embedding: "The assumption that the theory, which had been widely accepted, was flawed required considerable evidence."\nDense noun phrases: "The post-colonial re-evaluation of Eurocentric epistemological assumptions."\nMastery means choosing complexity purposefully for precision, not to impress.',
        readingTitle:'The Politics of Knowledge', readingText:'That knowledge is never produced in a political vacuum is a foundational claim of critical theory. The hegemony of certain epistemological frameworks over others reflects historical power relations rather than objective superiority. Discourse analysis reveals how language constructs, rather than merely reflects, social reality. The intertextuality of academic texts — the dense web of citation and allusion — performs a social as much as an intellectual function. Hermeneutics teaches that interpretation is always situated: that any reading is simultaneously a misreading. Praxis demands that theory be accountable to lived experience.',
        exercises:[{q:'What is "hegemony" in Arabic?',opts:['نظرية المعرفة','التفكيك','هيمنة','التناص'],correct:2},{q:'"That knowledge is political is evident" — the subject is:',opts:['knowledge','political','That knowledge is political','evident'],correct:2},{q:'"Hermeneutics" deals with:',opts:['Grammar rules','The theory of interpretation','Political science','Language origins'],correct:1},{q:'Dense noun phrases are used for:',opts:['Informality','Precision and information density','Emotional appeal','Simple communication'],correct:1},{q:'"Praxis" means:',opts:['النظرية المجردة','التحليل النقدي','الممارسة التطبيقية','الخطاب السياسي'],correct:2}],
        fillBlank:{sentence:'___ the hegemony of certain frameworks persists is a matter of ___ inquiry.',answer:'That / critical',hint:'nominal clause as subject: That + clause + verb'}},
      { titleAr: 'مهارات الترجمة', titleEn: 'Translation Skills',
        vocab: [{en:'Equivalence',ar:'تكافؤ'},{en:'Localization',ar:'توطين'},{en:'Calque',ar:'القرض الترجمي'},{en:'Semantic field',ar:'الحقل الدلالي'},{en:'False friend',ar:'الصديق الكاذب'},{en:'Domestication',ar:'التأهيل'},{en:'Foreignization',ar:'التغريب'},{en:'Transposition',ar:'التحويل النحوي'}],
        grammarTitle:'Contrastive Grammar: Arabic-English', grammarExplanation:'Key structural differences between Arabic and English:\n1. English requires an explicit subject; Arabic often drops it.\n2. English adjective precedes noun; Arabic adjective follows it.\n3. English uses articles (a/the) extensively; Arabic uses definiteness differently.\n4. English forms passives differently from Arabic derivational morphology.\n5. English tense system focuses on time; Arabic aspect system focuses on completion.\nAwareness of these contrasts prevents mother-tongue interference in translation.',
        readingTitle:'The Craft of Translation', readingText:'Translation is not the mechanical substitution of words but the recreation of meaning across linguistic and cultural boundaries. The challenge of equivalence — finding expressions that carry the same semantic, pragmatic, and cultural weight — is at the heart of the translator\'s art. False friends (cognates with different meanings) trap the unwary: "actual" in English ≠ "actual" in Spanish (= current). The debate between domestication (making the text feel native) and foreignization (preserving the source culture\'s strangeness) reflects deeper questions about cultural identity and power.',
        exercises:[{q:'What is "false friend" in Arabic?',opts:['التكافؤ','الصديق الكاذب','التوطين','القرض الترجمي'],correct:1},{q:'English adjectives appear ___ nouns:',opts:['After','Before','Either side of','Separately from'],correct:1},{q:'"Domestication" in translation means:',opts:['Preserving source culture\'s strangeness','Making text feel native to target culture','Word-for-word translation','Literal translation'],correct:1},{q:'What is "equivalence" in Arabic?',opts:['تغريب','توطين','تكافؤ','تناص'],correct:2},{q:'English requires ___ subject in every clause:',opts:['An optional','A reduced','An explicit','An implied'],correct:2}],
        fillBlank:{sentence:'A skilled translator seeks ___ not just at the word level but at the cultural and ___ level.',answer:'equivalence / pragmatic',hint:'translation theory key terms'}},
      { titleAr: 'تحليل اللغة', titleEn: 'Language Analysis',
        vocab: [{en:'Morpheme',ar:'مورفيم'},{en:'Phoneme',ar:'فونيم'},{en:'Syntax',ar:'النحو'},{en:'Lexicon',ar:'المعجم'},{en:'Semantics',ar:'الدلالة'},{en:'Pragmatics',ar:'التداوليات'},{en:'Sociolinguistics',ar:'علم اللغة الاجتماعي'},{en:'Diachronic',ar:'تاريخي تطوري'}],
        grammarTitle:'Levels of Linguistic Analysis', grammarExplanation:'Language analysis operates at multiple levels simultaneously:\nPhonology: the study of sound systems and phonemes.\nMorphology: the study of morphemes (smallest meaningful units: un-happi-ness = 3 morphemes).\nSyntax: the rules governing sentence structure.\nSemantics: the study of meaning at word and sentence level.\nPragmatics: meaning in context and use.\nSociolinguistics: how language varies with social factors (age, region, class).\nEach level reveals different dimensions of how language works.',
        readingTitle:'How Language Works', readingText:'Linguistic analysis reveals that language is a multi-layered system operating simultaneously at phonological, morphological, syntactic, semantic, and pragmatic levels. A single utterance such as "Can you pass the salt?" operates phonetically as a sequence of sounds, morphologically as a string of bound and free morphemes, syntactically as an interrogative clause, semantically as a question about ability, and pragmatically as a polite request. Sociolinguistics adds the dimension of social variation: how speakers deploy different registers, dialects, and codes depending on audience and context. Diachronic analysis traces how these systems evolve over centuries.',
        exercises:[{q:'"Un-happi-ness" has how many morphemes?',opts:['One','Two','Three','Four'],correct:2},{q:'What is "phoneme" in Arabic?',opts:['مورفيم','فونيم','النحو','الدلالة'],correct:1},{q:'"Can you pass the salt?" pragmatically is:',opts:['A question about ability','An indirect request','A yes/no question','A command'],correct:1},{q:'Sociolinguistics studies:',opts:['Only grammar rules','Sound systems','Language and social factors','Historical language change'],correct:2},{q:'"Diachronic" analysis is:',opts:['Current language use','Historical language evolution','Social language variation','Pragmatic analysis'],correct:1}],
        fillBlank:{sentence:'___ studies how language varies across social groups, while ___ analysis traces its historical development.',answer:'Sociolinguistics / diachronic',hint:'two branches of linguistic analysis'}},
      { titleAr: 'اختبار الإتقان', titleEn: 'Mastery Assessment',
        vocab: [{en:'Proficiency',ar:'إتقان'},{en:'Competence',ar:'كفاءة'},{en:'Benchmark',ar:'معيار'},{en:'Portfolio',ar:'ملف الإنجاز'},{en:'Self-assessment',ar:'التقييم الذاتي'},{en:'Fluency',ar:'طلاقة'},{en:'Accuracy',ar:'دقة'},{en:'Complexity',ar:'تعقيد'}],
        grammarTitle:'Integrating All Grammar: The C2 Writer', grammarExplanation:'A C2 writer integrates all grammatical resources flexibly and appropriately:\n• Varies between simple and complex structures for stylistic effect.\n• Uses fronting, inversion, clefting for emphasis when needed.\n• Deploys nominalization for academic register, active voice for clarity.\n• Commands the subjunctive, all conditionals, and modal nuance.\n• Chooses passive or active based on information structure, not habit.\nMastery is not about using complex structures always — it\'s about knowing WHEN to use them.',
        readingTitle:'Reaching Mastery', readingText:'C2 proficiency represents not the end of language learning but its most sophisticated beginning. At this level, learners have transcended rule-following and entered the realm of creative linguistic freedom — the ability to bend conventions knowingly, deploy irony and indirection masterfully, and adapt register with unconscious precision. The benchmark for mastery is not perfection in every sentence but the consistent demonstration of competence across all dimensions: accuracy, fluency, complexity, and pragmatic appropriateness. A portfolio of authentic language use, critically self-assessed, remains the most valid measure of true proficiency.',
        exercises:[{q:'C2 mastery means:',opts:['Perfect grammar always','Flexible use of all resources','Only complex sentences','No errors ever'],correct:1},{q:'What is "fluency" in Arabic?',opts:['دقة','تعقيد','طلاقة','كفاءة'],correct:2},{q:'The best measure of C2 is:',opts:['A grammar test','A vocabulary test','Authentic language portfolio','Speed of reading'],correct:2},{q:'"Self-assessment" in Arabic:',opts:['معيار','التقييم الذاتي','ملف الإنجاز','إتقان'],correct:1},{q:'At C2, a writer chooses passive or active based on:',opts:['Habit','Difficulty','Information structure','Randomness'],correct:2}],
        fillBlank:{sentence:'True ___ is demonstrated not through perfect ___ but through flexible, appropriate language use.',answer:'proficiency / accuracy',hint:'the two key C2 concepts'}},
    ]},
}

const PLACEMENT_QUESTIONS = [
  { q: 'What is the correct sentence?', opts: ['She go to work', 'She goes to work', 'She going to work', 'She gone to work'], correct: 1 },
  { q: 'Choose the correct past tense: "I ___ a film last night."', opts: ['watch', 'watched', 'watching', 'watches'], correct: 1 },
  { q: 'What does "enormous" mean?', opts: ['Very small', 'Very fast', 'Very large', 'Very quiet'], correct: 2 },
  { q: '"The book ___ by Tolstoy" — choose the correct passive form.', opts: ['wrote', 'is written', 'was written', 'has write'], correct: 2 },
  { q: '"If I ___ more time, I would study harder." (hypothetical)', opts: ['have', 'had', 'would have', 'will have'], correct: 1 },
  { q: '"Despite the rain, they ___ the match." Choose correctly:', opts: ['win', 'won', 'winning', 'to win'], correct: 1 },
  { q: '"I suggest that he ___ on time." (subjunctive)', opts: ['is', 'be', 'was', 'were'], correct: 1 },
  { q: 'Which is a hedging phrase used in academic writing?', opts: ['It is definitely true that', 'This may suggest that', 'Everyone knows', 'Obviously,'], correct: 1 },
]
function getLevelFromScore(s: number): string {
  if (s <= 1) return 'A1'; if (s <= 3) return 'A2'; if (s <= 4) return 'B1'
  if (s <= 5) return 'B2'; if (s <= 6) return 'C1'; return 'C2'
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnglishProgramPage() {
  const { user } = useAuthStore()
  const [activeLevel, setActiveLevel] = useState('A1')
  const [openUnit, setOpenUnit] = useState<{ level: string; idx: number } | null>(null)
  const [unitTab, setUnitTab] = useState<'vocab' | 'grammar' | 'reading' | 'exercises'>('vocab')
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({})
  const [mcqSubmitted, setMcqSubmitted] = useState(false)
  const [fillAnswer, setFillAnswer] = useState('')
  const [fillChecked, setFillChecked] = useState(false)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [showPlacement, setShowPlacement] = useState(false)
  const [ptAnswers, setPtAnswers] = useState<number[]>([])
  const [ptQuestion, setPtQuestion] = useState(0)
  const [ptResult, setPtResult] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const userName = (user?.first_name_ar || user?.first_name || 'الطالب') as string

  useEffect(() => {
    const stored: Record<string, boolean> = {}
    Object.keys(LEVELS).forEach(lv => {
      LEVELS[lv].units.forEach((_: Unit, i: number) => {
        const key = `english_progress_${lv}_${i}`
        if (typeof window !== 'undefined') {
          const val = localStorage.getItem(key)
          if (val === 'true') stored[key] = true
        }
      })
    })
    setProgress(stored)

    // Load current level from backend
    englishAPI.getProgress().then(r => {
      const data = r.data
      if (data?.current_level && LEVELS[data.current_level]) {
        setActiveLevel(data.current_level)
      }
    }).catch(() => {})
  }, [])

  const markComplete = (level: string, idx: number) => {
    const key = `english_progress_${level}_${idx}`
    if (typeof window !== 'undefined') localStorage.setItem(key, 'true')
    setProgress(p => ({ ...p, [key]: true }))
  }
  const isComplete = (level: string, idx: number) => !!progress[`english_progress_${level}_${idx}`]
  const levelProgress = (level: string) => {
    const total = LEVELS[level].units.length
    const done = LEVELS[level].units.filter((_: Unit, i: number) => isComplete(level, i)).length
    return { done, total, pct: Math.round((done / total) * 100) }
  }
  const isLevelComplete = (level: string) => levelProgress(level).done === levelProgress(level).total

  const openUnitModal = (level: string, idx: number) => {
    setOpenUnit({ level, idx }); setUnitTab('vocab')
    setMcqAnswers({}); setMcqSubmitted(false); setFillAnswer(''); setFillChecked(false)
  }
  const currentUnit: Unit | null = openUnit ? LEVELS[openUnit.level].units[openUnit.idx] : null

  const handlePtAnswer = (ans: number) => {
    const next = [...ptAnswers, ans]
    if (ptQuestion < PLACEMENT_QUESTIONS.length - 1) {
      setPtAnswers(next); setPtQuestion(q => q + 1)
    } else {
      const score = next.filter((a, i) => a === PLACEMENT_QUESTIONS[i].correct).length
      const level = getLevelFromScore(score)
      setPtResult(level)
      // Submit to backend
      const answersObj: Record<string, number> = {}
      next.forEach((a, i) => { answersObj[String(i)] = a })
      englishAPI.submitPlacementTest(answersObj, 10).catch(() => {})
    }
  }

  const sendChat = async () => {
    if (!chatInput.trim()) return
    const msg = chatInput.trim(); setChatInput('')
    setChatMessages(p => [...p, { role: 'user', content: msg }]); setChatLoading(true)
    try {
      const res = await englishAPI.chat(msg, activeLevel, chatMessages.map(m => ({ role: m.role, content: m.content }))).then(r => r.data)
      setChatMessages(p => [...p, { role: 'assistant', content: (res as Record<string, unknown>).response as string }])
    } catch { setChatMessages(p => [...p, { role: 'assistant', content: "I'm here to help! Try asking me about vocabulary or grammar. 😊" }]) }
    setChatLoading(false)
  }
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const lv = LEVELS[activeLevel]
  const lp = levelProgress(activeLevel)

  return (
    <DashboardLayout>
      <div className="flex gap-4 max-w-7xl" style={{ minHeight: '80vh' }}>
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1">
          <div className="card-uni mb-3 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-uni-blue" />
              <span className="text-xs font-bold text-uni-text">مستويات CEFR</span>
            </div>
            {Object.entries(LEVELS).map(([key, val]) => {
              const p = levelProgress(key)
              return (
                <button key={key} onClick={() => setActiveLevel(key)}
                  className={`w-full text-right px-2 py-2 rounded-lg text-xs mb-1 transition-all flex items-center justify-between ${activeLevel === key ? `${val.color} ${val.border} border ${val.text} font-bold` : 'text-uni-muted hover:text-uni-text hover:bg-uni-card'}`}>
                  <span>{key} <span className="opacity-70">· {val.nameAr}</span></span>
                  {isLevelComplete(key) && <CheckCircle className="w-3 h-3 text-green-400" />}
                </button>
              )
            })}
          </div>
          <button onClick={() => { setShowPlacement(true); setPtQuestion(0); setPtAnswers([]); setPtResult(null) }}
            className="w-full text-xs py-2 px-3 rounded-lg border border-uni-gold/30 text-uni-gold hover:bg-uni-gold/10 transition-all">
            🎯 اختبار المستوى
          </button>
          <button onClick={() => setShowChat(c => !c)}
            className="w-full text-xs py-2 px-3 rounded-lg border border-uni-blue/30 text-uni-blue hover:bg-uni-blue/10 transition-all">
            💬 {showChat ? 'أخفِ المحادثة' : 'تحدث مع AI'}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Level Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`card-uni ${lv.color} ${lv.border} border`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className={`text-3xl font-black ${lv.text}`}>{activeLevel}</span>
                  <div>
                    <div className="font-bold text-uni-text">{lv.name}</div>
                    <div className="text-uni-muted text-xs">{lv.nameAr} · {lp.total} وحدات</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-uni-border/30 rounded-full overflow-hidden w-32">
                    <motion.div className="h-full bg-uni-gold rounded-full" initial={{ width: 0 }} animate={{ width: `${lp.pct}%` }} />
                  </div>
                  <span className="text-xs text-uni-muted">{lp.done}/{lp.total}</span>
                </div>
              </div>
              {isLevelComplete(activeLevel) && (
                <button onClick={() => generateCertificate(userName, activeLevel, lv.nameAr)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-uni-gold/10 border border-uni-gold/30 text-uni-gold text-sm font-semibold hover:bg-uni-gold/20 transition-all">
                  <Download className="w-4 h-4" /> شهادة الإتمام
                </button>
              )}
            </div>
          </motion.div>

          {/* Units Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lv.units.map((unit: Unit, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => openUnitModal(activeLevel, i)}
                className={`card-uni cursor-pointer hover:border-uni-gold/30 transition-all group border ${isComplete(activeLevel, i) ? 'border-green-500/30 bg-green-500/5' : 'border-uni-border/30'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${lv.color} ${lv.text} border ${lv.border}`}>{i + 1}</div>
                  {isComplete(activeLevel, i) && <CheckCircle className="w-4 h-4 text-green-400" />}
                </div>
                <div className="font-bold text-uni-text text-sm mb-0.5">{unit.titleAr}</div>
                <div className="text-uni-muted text-xs mb-2">{unit.titleEn}</div>
                <div className="flex flex-wrap gap-1">
                  {['مفردات', 'قواعد', 'قراءة', 'تمارين'].map(t => (
                    <span key={t} className="badge-gold text-xs px-2 py-0.5 text-uni-gold border border-uni-gold/20 rounded-full">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Chat Panel */}
          <AnimatePresence>
            {showChat && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="card-uni border-uni-blue/20 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-uni-blue" />
                  <span className="font-semibold text-uni-text text-sm">Professor Sarah — AI English Tutor</span>
                  <span className="text-xs text-uni-muted mr-auto">مستوى: {activeLevel}</span>
                </div>
                <div className="h-48 overflow-y-auto space-y-2 mb-3 pr-1">
                  {chatMessages.length === 0 && <p className="text-uni-muted text-xs text-center py-4">ابدأ محادثة بالإنجليزية! / Start a conversation in English!</p>}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-xl text-xs ${m.role === 'user' ? 'bg-uni-gold/20 border border-uni-gold/20 text-uni-text' : 'bg-uni-card border border-uni-border/30 text-uni-text'}`}>
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div className="flex justify-start"><div className="px-3 py-2 rounded-xl bg-uni-card border border-uni-border/30"><Loader2 className="w-3 h-3 animate-spin text-uni-blue" /></div></div>}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Type in English..." dir="ltr"
                    className="flex-1 bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-xs text-uni-text focus:border-uni-blue outline-none" />
                  <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                    className="bg-uni-blue text-white w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-50">
                    {chatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Unit Modal */}
      <AnimatePresence>
        {openUnit && currentUnit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setOpenUnit(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="glass rounded-2xl border border-uni-border/30 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className={`px-5 py-3 border-b border-uni-border/30 flex items-center justify-between flex-shrink-0 ${LEVELS[openUnit.level].color}`}>
                <div>
                  <span className={`font-black text-lg ${LEVELS[openUnit.level].text}`}>{activeLevel} · </span>
                  <span className="font-bold text-uni-text">{currentUnit.titleAr}</span>
                  <div className="text-uni-muted text-xs">{currentUnit.titleEn}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isComplete(openUnit.level, openUnit.idx) && <CheckCircle className="w-5 h-5 text-green-400" />}
                  <button onClick={() => setOpenUnit(null)}><X className="w-5 h-5 text-uni-muted hover:text-uni-text" /></button>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 px-4 py-2 border-b border-uni-border/30 flex-shrink-0">
                {(['vocab', 'grammar', 'reading', 'exercises'] as const).map(t => (
                  <button key={t} onClick={() => setUnitTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitTab === t ? 'bg-uni-gold/20 text-uni-gold border border-uni-gold/30' : 'text-uni-muted hover:text-uni-text'}`}>
                    {t === 'vocab' ? 'مفردات' : t === 'grammar' ? 'قواعد' : t === 'reading' ? 'قراءة' : 'تمارين'}
                  </button>
                ))}
              </div>
              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {unitTab === 'vocab' && (
                  <div>
                    <h3 className="font-bold text-uni-text mb-3 text-sm">المفردات الأساسية · Key Vocabulary</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {currentUnit.vocab.map((w: VocabWord, i: number) => (
                        <div key={i} className="bg-uni-card border border-uni-border/30 rounded-xl p-3 flex justify-between items-center">
                          <span className="font-bold text-uni-text text-sm" dir="ltr">{w.en}</span>
                          <span className="text-uni-gold text-sm">{w.ar}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {unitTab === 'grammar' && (
                  <div>
                    <h3 className="font-bold text-uni-text mb-1">{currentUnit.grammarTitle}</h3>
                    <div className="bg-uni-card border border-uni-blue/20 rounded-xl p-4 text-sm text-uni-text whitespace-pre-line leading-relaxed" dir="ltr">
                      {currentUnit.grammarExplanation}
                    </div>
                  </div>
                )}
                {unitTab === 'reading' && (
                  <div>
                    <h3 className="font-bold text-uni-text mb-3">{currentUnit.readingTitle}</h3>
                    <div className="bg-uni-card border border-uni-border/30 rounded-xl p-4 text-sm text-uni-text leading-relaxed" dir="ltr">
                      {currentUnit.readingText}
                    </div>
                  </div>
                )}
                {unitTab === 'exercises' && (
                  <div className="space-y-5">
                    <h3 className="font-bold text-uni-text text-sm">التمارين · Exercises</h3>
                    {currentUnit.exercises.map((ex: MCQ, ei: number) => (
                      <div key={ei} className="bg-uni-card border border-uni-border/30 rounded-xl p-4">
                        <p className="text-sm font-semibold text-uni-text mb-2" dir="ltr">{ei + 1}. {ex.q}</p>
                        <div className="space-y-1">
                          {ex.opts.map((opt: string, oi: number) => {
                            let cls = 'border-uni-border/30 text-uni-text hover:border-uni-gold/30'
                            if (mcqSubmitted) {
                              if (oi === ex.correct) cls = 'border-green-500/50 bg-green-500/10 text-green-300'
                              else if (mcqAnswers[ei] === oi) cls = 'border-red-500/50 bg-red-500/10 text-red-300'
                            } else if (mcqAnswers[ei] === oi) cls = 'border-uni-gold/50 bg-uni-gold/10 text-uni-gold'
                            return (
                              <button key={oi} disabled={mcqSubmitted}
                                onClick={() => setMcqAnswers(a => ({ ...a, [ei]: oi }))}
                                className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`} dir="ltr">
                                {String.fromCharCode(65 + oi)}. {opt}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {/* Fill in the blank */}
                    <div className="bg-uni-card border border-uni-blue/20 rounded-xl p-4">
                      <p className="text-xs text-uni-muted mb-2">Fill in the blank:</p>
                      <p className="text-sm text-uni-text mb-3" dir="ltr">{currentUnit.fillBlank.sentence}</p>
                      <input value={fillAnswer} onChange={e => setFillAnswer(e.target.value)} disabled={fillChecked}
                        placeholder={`Hint: ${currentUnit.fillBlank.hint}`} dir="ltr"
                        className="w-full bg-uni-dark border border-uni-border rounded-lg px-3 py-2 text-sm text-uni-text focus:border-uni-blue outline-none mb-2" />
                      {fillChecked && (
                        <p className={`text-xs ${fillAnswer.toLowerCase().trim() === currentUnit.fillBlank.answer.toLowerCase() ? 'text-green-400' : 'text-uni-muted'}`}>
                          {fillAnswer.toLowerCase().trim() === currentUnit.fillBlank.answer.toLowerCase() ? '✓ Correct!' : `Answer: ${currentUnit.fillBlank.answer}`}
                        </p>
                      )}
                    </div>
                    {/* Action buttons */}
                    {!mcqSubmitted ? (
                      <button onClick={() => { setMcqSubmitted(true); setFillChecked(true) }}
                        disabled={Object.keys(mcqAnswers).length < currentUnit.exercises.length}
                        className="w-full py-2.5 rounded-xl bg-uni-blue text-white text-sm font-bold disabled:opacity-40 hover:bg-blue-500 transition-all">
                        تحقق من الإجابات · Check Answers
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center font-semibold">
                          {currentUnit.exercises.filter((ex: MCQ, ei: number) => mcqAnswers[ei] === ex.correct).length}/{currentUnit.exercises.length} صحيح
                        </div>
                        <button onClick={() => { markComplete(openUnit.level, openUnit.idx) }}
                          className="flex-1 py-2.5 rounded-xl bg-uni-gold/10 border border-uni-gold/30 text-uni-gold text-sm font-bold hover:bg-uni-gold/20 transition-all flex items-center justify-center gap-2">
                          <Award className="w-4 h-4" /> وحدة مكتملة
                        </button>
                      </div>
                    )}
                    {isLevelComplete(openUnit.level) && (
                      <button onClick={() => generateCertificate(userName, openUnit.level, LEVELS[openUnit.level].nameAr)}
                        className="w-full py-2.5 rounded-xl border border-uni-gold/40 text-uni-gold text-sm font-bold hover:bg-uni-gold/10 transition-all flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> تحميل شهادة المستوى
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placement Test Modal */}
      <AnimatePresence>
        {showPlacement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="glass rounded-2xl border border-uni-gold/20 w-full max-w-md p-6">
              {!ptResult ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-uni-text">اختبار تحديد المستوى</h3>
                    <button onClick={() => setShowPlacement(false)}><X className="w-5 h-5 text-uni-muted" /></button>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-uni-muted mb-1">
                      <span>سؤال {ptQuestion + 1} من {PLACEMENT_QUESTIONS.length}</span>
                      <span>{Math.round((ptQuestion / PLACEMENT_QUESTIONS.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-uni-border/30 rounded-full overflow-hidden">
                      <div className="h-full bg-uni-gold rounded-full transition-all" style={{ width: `${(ptQuestion / PLACEMENT_QUESTIONS.length) * 100}%` }} />
                    </div>
                  </div>
                  <p className="text-uni-text font-semibold mb-4 text-sm" dir="ltr">{PLACEMENT_QUESTIONS[ptQuestion].q}</p>
                  <div className="space-y-2">
                    {PLACEMENT_QUESTIONS[ptQuestion].opts.map((opt: string, i: number) => (
                      <button key={i} onClick={() => handlePtAnswer(i)}
                        className="w-full text-left px-4 py-2.5 rounded-xl border border-uni-border hover:border-uni-gold/40 hover:bg-uni-gold/10 text-uni-text text-sm transition-all" dir="ltr">
                        {String.fromCharCode(65 + i)}. {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
                  <h3 className="text-2xl font-black text-uni-text mb-1">مستواك: {ptResult}</h3>
                  <p className="text-uni-gold font-bold mb-2">{LEVELS[ptResult].nameAr} · {LEVELS[ptResult].name}</p>
                  <p className="text-uni-muted text-xs mb-5">ابدأ بهذا المستوى وتدرّج حتى C2</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => { setActiveLevel(ptResult); setShowPlacement(false) }}
                      className="bg-uni-blue text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all">
                      ابدأ التعلم
                    </button>
                    <button onClick={() => generateCertificate(userName, ptResult, LEVELS[ptResult].nameAr)}
                      className="flex items-center gap-1 border border-uni-gold/30 text-uni-gold px-4 py-2 rounded-xl text-sm font-bold hover:bg-uni-gold/10 transition-all">
                      <Download className="w-4 h-4" /> شهادة
                    </button>
                    <button onClick={() => setShowPlacement(false)}
                      className="border border-uni-border/30 text-uni-muted px-3 py-2 rounded-xl text-sm hover:text-uni-text">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
