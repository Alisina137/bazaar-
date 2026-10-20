// Localized administrative district data (34 provinces, 401 districts).
// Derived from Open Admin Data's Afghanistan Administrative Divisions dataset
// (2026-09-08), CC BY 4.0. See docs/AFGHANISTAN-DISTRICTS-DATA.md.
// The canonical stored value is the English district name; the localized
// display name uses the dataset's Dari/Pashto-script name.
import type { ProvinceName } from "@/marketplace/provinces";

type DistrictName = readonly [english: string, local: string];

export const DISTRICTS_BY_PROVINCE: Readonly<Record<ProvinceName, readonly DistrictName[]>> = {
  "Badakhshan": [["Arghanj Khwah","ارغنچخواه"],["Argo","ارگو"],["Baharak","بهارک"],["Darayem","درایم"],["Darwaz-e-Balla","دروازبالا ( نیسی)"],["Darwaz-e-Payin","درواز پائین (ما می )"],["Eshkashem","اشکاشم"],["Fayzabad","فیض آباد"],["Jorm","جرم"],["Keshem","کشم"],["Khash","خاش"],["Khwahan","خواهان"],["Kofab","کوف آب"],["Kohistan","کوهستان"],["Koran Wa Monjan","کران ومنجان"],["Raghestan","راغستان"],["Shahr-e-Buzorg","شهر بزرگ"],["Shaki","شکی"],["Shighnan","شغنان"],["Shuhada","شهدا"],["Tagab","تگاب"],["Teshkan","تشکان"],["Wakhan","واخان"],["Warduj","وردوج"],["Yaftal-e-Sufla","یفتل سفلی"],["Yamgan","یمگان"],["Yawan","یاوان"],["Zebak","زیباک"]],
  "Badghis": [["Ab Kamari","آب کمری"],["Bala Murghab","بالا مرغاب"],["Ghormach","غورماچ"],["Jawand","جوند"],["Muqur","مقر"],["Qadis","قادیس"],["Qala-e-Naw","قلعه نو"]],
  "Baghlan": [["Andarab","اندراب"],["Baghlan-e-Jadid","بغلان جدید"],["Burka","بورکه"],["Dahana-e-Ghori","دهنۀ غوری"],["Deh Salah","ده صلاح"],["Doshi","دوشی"],["Fereng Wa Gharu","فرنگ وغارو"],["Guzargah-e-Nur","گذرگاه نور"],["Khinjan","خنجان"],["Khost Wa Fereng","خوست و فرنگ"],["Khwaja Hejran","خواجه هجران"],["Nahrin","نهرین"],["Pul-e-Hisar","پل حصار"],["Pul-e-Khumri","پلخمری"],["Tala Wa Barfak","تاله وبرفک"]],
  "Balkh": [["Balkh","بلخ"],["Char Bolak","چار بولک"],["Charkent","چار کنت"],["Chemtal","چمتال"],["Dawlat Abad","دولت آباد"],["Dehdadi","دهدادی"],["Kaldar","کلدار"],["Keshendeh","کشنده"],["Marmul","مارمُل"],["Mazar-e-Sharif","مزار شریف"],["Nahr-e-Shahi","نهر شاهی"],["Sharak-e-Hayratan","شهرک حیرتان"],["Sholgareh","شولگره"],["Shortepa","شور تیپه"],["Zari","زاری"]],
  "Bamyan": [["Bamyan","بامیان"],["Kahmard","کهمرد"],["Panjab","پنجاب"],["Sayghan","سیغان"],["Shibar","شیبر"],["Waras","ورث"],["Yakawlang","یکاولنگ"]],
  "Daykundi": [["Ashtarlay","اشترلی"],["Kajran","کجران"],["Khadir","خدیر"],["Kiti","کیتی"],["Miramor","میرامور"],["Nili","نیلی"],["Patoo","پاتو"],["Sang-e-Takht","سنگ تخت"],["Shahrestan","شهرستان"]],
  "Farah": [["Anar Dara","انار دره"],["Bakwa","بکواه"],["Bala Buluk","بالا بلوک"],["Farah","فراه"],["Gulistan","گلستان"],["Khak-e-Safed","خاک سفید"],["Lash-e-Juwayn","لاش جوین"],["Pur Chaman","پُرچمن"],["Pushtrod","پشترود"],["Qala-e-Kah","قلعه کاه"],["Shibkoh","شیب کوه"]],
  "Faryab": [["Almar","المار"],["Andkhoy","اندخوی"],["Bilcheragh","بلچراغ"],["Dawlat Abad","دولت آباد"],["Garzewan","گرزیوان"],["Khan-e-Char Bagh","خان چارباغ"],["Khwaja Sabz Posh","خواجه سبزپوش"],["Kohistan","کوهستان"],["Maymana","میمنه"],["Pashtun Kot","پشتون کوټ"],["Qaram Qul","قرم قل"],["Qaysar","قیصار"],["Qurghan","قرغان"],["Shirin Tagab","شیرین تگاب"]],
  "Ghazni": [["Ab Band","آب بند"],["Ajristan","اجرستان"],["Andar","اندړ"],["Deh Yak","ده یک"],["Gelan","گیلان"],["Ghazni","غزنی"],["Giro","گیرو"],["Jaghatu","جغتو"],["Jaghuri","جاغوری"],["Khwaja Umari","خواجه عمری"],["Malistan","مالستان"],["Muqur","مقر"],["Nawa","ناوه"],["Nawur","ناور"],["Qara Bagh","قره باغ"],["Rashidan","رشیدان"],["Waghaz","واغظ"],["Wal-e-Muhammad-e-Shahid","ولی محمد شهید"],["Zanakhan","زنه خان"]],
  "Ghor": [["Charsadra","چار صد ره"],["Dawlatyar","دولت یار"],["DoLayna","دو لینه"],["Feroz Koh","فیروزکوه"],["Lal Wa Sarjangal","لعل و سرجنگل"],["Pasaband","پسابند"],["Saghar","ساغر"],["Shahrak","شهرک"],["Taywarah","تیوره"],["Tolak","تولک"]],
  "Helmand": [["Baghran","باغران"],["Deh-e-Shu","دیشو"],["Garmser","گرم سیر"],["Kajaki","کجکی"],["Lashkargah","لشکرگاه"],["Musa Qala","موسی قلعه"],["Nad-e-Ali","نادعلی"],["Nahr-e-Saraj","نهر سراج"],["Nawa-e-Barakzaiy","ناوه بارکزائی"],["Nawzad","نوزاد"],["Reg-i-Khan Nishin","ریگ خان نشین"],["Sangin","سنگین"],["Washer","واشیر"]],
  "Herat": [["Adraskan","ادرسکن"],["Chisht-e-Sharif","چشت شریف"],["Farsi","فرسی"],["Ghoryan","غوریان"],["Gulran","گلران"],["Guzara","گذره"],["Hirat","هرات"],["Injil","انجیل"],["Karukh","کرُخ"],["Kohsan","کوهسان"],["Kushk","کُشک"],["Kushk-e-Kuhna","کُشک کهنه"],["Obe","اوبی"],["Pashtun Zarghun","پشتون زرغون"],["Shindand","شیندند"],["Zindajan","زنده جان"]],
  "Jowzjan": [["Aqcha","آقچه"],["Darzab","درز آب"],["Fayzabad","فیض آباد"],["Khamyab","خمیاب"],["Khanaqa","خانقا"],["Khwaja Dukoh","خواجه دوکوه"],["Mardyan","مردیان"],["Mingajik","منگجک"],["Qarqin","قرقین"],["Qush Tepa","قوش تیپه"],["Shiberghan","شبرغان"]],
  "Kabul": [["Bagrami","بگرامی"],["Chahar Asyab","چهار آسیاب"],["Deh Sabz","ده سبز"],["Estalef","استالف"],["Farza","فرزه"],["Guldara","گلدره"],["Kabul","کابل"],["Kalakan","کلکان"],["Khak-e-Jabbar","خاک جبار"],["Mir Bacha Kot","میر بچه کوت"],["Musahi","موسهی"],["Paghman","پغمان"],["Qara Bagh","قره باغ"],["Shakar Dara","شکردره"],["Surobi","سروبی"]],
  "Kandahar": [["Arghandab","ارغنداب"],["Arghestan","ارغستان"],["Daman","دامان"],["Ghorak","غورک"],["Kandahar","کندهار"],["Khakrez","خاکریز"],["Maruf","معروف"],["Maywand","میوند"],["Miyanshin","میانشین"],["Nesh","نیش"],["Panjwayi","پنجوائی"],["Reg","ریگ ( شگه )"],["Shah Wali Kot","شاه ولی کوت"],["Shorabak","شور آبک"],["Spin Boldak","سپین بولدک"],["Zheray","ژړۍ"]],
  "Kapisa": [["Alasay","اله سای"],["Hisa-e-Awal-e-Kohistan","حصه اول کوهستان"],["Hisa-e-Duwum-e-Kohistan","حصه دوم کوهستان"],["Koh Band","کوه بند"],["Mahmood-e-Raqi","محمود راقی"],["Nijrab","نجراب"],["Tagab","تگاب"]],
  "Khost": [["Bak","باک"],["Gurbuz","گربز"],["Jaji Maydan","جاجی میدان"],["Mandozayi","مندوزائی"],["Matun","خوست (متون)"],["Musa Khel","موسی خیل"],["Nadir Shah Kot","نادرشاه کوت"],["Qalandar","قلندر"],["Sabari","صبری"],["Shamal","شمل"],["Spera","سپیره"],["Tani","تنی"],["Terezayi","تری زائی"]],
  "Kunar": [["Asad Abad","اسد آباد"],["Bar Kunar","برکنر"],["Chapa Dara","چپه دره"],["Chawkay","چوکی"],["Dangam","دانگام"],["Dara-e-Pech","دره پیچ"],["Ghazi Abad","غازی آباد"],["Khas Kunar","خاص کنر"],["Marawara","مروره"],["Narang","نرنگ"],["Nari","ناړی"],["Nurgal","نورگل"],["Sar Kani","سرکانی"],["Shigal","شیگل وشلتن"],["Watapur","وته پور"]],
  "Kunduz": [["Ali Abad","علی آباد"],["Chahar Darah","چهار دره"],["Dasht-e-Archi","دشت ارچی"],["Imam Sahib","امام صاحب"],["Khan Abad","خان آباد"],["Kunduz","کندز"],["Qala-e-Zal","قلعه ذال"]],
  "Laghman": [["Alingar","علینگار"],["Alishang","علیشنگ"],["Dawlatshah","دولت شاه"],["Mehtarlam","مهتر لام"],["Qarghayi","قرغه ئی"]],
  "Logar": [["Azra","ازره"],["Baraki Barak","برکی برک"],["Charkh","چرخ"],["Kharwar","خروار"],["Khoshi","خوشی"],["Mohammad Agha","محمدآغه"],["Pul-e-Alam","پل علم"]],
  "Nangarhar": [["Achin","اچین"],["Bati Kot","بتی کوټ"],["Behsud","بهسود"],["Chaparhar","چپر هار"],["Dara-e-Nur","دره نور"],["Deh Bala","ده بالا"],["Dur Baba","دُر بابا"],["Goshta","گوشته"],["Hesarak","حصارک"],["Jalalabad","جلال آباد"],["Kama","کامه"],["Khogyani","خوگیانی"],["Kot","کوټ"],["Kuz Kunar","کوز کنر"],["Lalpur","لعل پور"],["Muhmand Dara","مهمند دره"],["Nazyan","نازیان"],["Pachir Wa Agam","پچیراگام"],["Rodat","رودات"],["Sherzad","شیرزاد"],["Shinwar","شینوار"],["Surkh Rod","سرخ رود"]],
  "Nimroz": [["Chakhansur","چخانسور"],["Char Burjak","چاربرجک"],["Kang","کنگ"],["Khashrod","خاش رود"],["Zaranj","زرنج"]],
  "Nuristan": [["Barg-e-Matal","برگ متال"],["Duab","دو آب"],["Kamdesh","کامدیش"],["Mandol","مندول"],["Nurgaram","نورگرام"],["Parun","پرونس"],["Wama","واما"],["Waygal","وایگل"]],
  "Paktia": [["Ahmadaba","احمد آبا"],["Chamkani","څمکنی"],["Dand Wa Patan","دند وپټان"],["Gardez","گردیز"],["Jaji","علی خیل"],["Jani Khel","جانی خیل"],["Lija Ahmad Khel","لجه احمد خیل"],["Sayed Karam","سیدکرم"],["Shawak","شواک"],["Zadran","حّدران"],["Zurmat","زُرمت"]],
  "Paktika": [["Barmal","برمل"],["Dila","دیله"],["Giyan","گیان"],["Gomal","گومل"],["Jani Khel","جانی خیل"],["Mata Khan","متاخان"],["Nika","نیکه"],["Omna","اومنه"],["Sar Rawzah","سرروضه (سرحوضه)"],["Sharan","شرن"],["Surobi","سروبی"],["Turwo","تروو"],["Urgun","ارگون"],["Wazakhah","وازه خواه"],["Wormamay","وړ ممی"],["Yahya Khel","یحی خیل"],["Yosuf Khel","یوسف خیل"],["Zarghun Shahr","زرغون شهر"],["Ziruk","زیړوک"]],
  "Panjshir": [["Anawa","عنابه"],["Bazarak","بازارک"],["Dara","دره"],["Khenj","خنج (حصه اول)"],["Paryan","پریان"],["Rukha","رُخه"],["Shutul","شُتل"]],
  "Parwan": [["Bagram","بگرام"],["Charikar","چاریکار"],["Ghorband","غوربند"],["Jabal Saraj","جبل السراج"],["Koh-e-Safi","کوه صافی"],["Salang","سالنگ"],["Sayed Khel","سیدخیل"],["Shekh Ali","شیخ علی"],["Shinwari","شینواری"],["Surkh-e-Parsa","سرخ پارسا"]],
  "Samangan": [["Aybak","ایبک"],["Dara-e-Suf-e-Bala","درۀ صوف بالا"],["Dara-e-Suf-e-Payin","درۀ صوف پائین"],["Feroz Nakhchir","فیروز نخچیر"],["Hazrat-e-Sultan","حضرت سلطان"],["Khulm","خلم"],["Khuram Wa Sarbagh","خرم وسارباغ"],["Ruy-e-Duab","روی دو آب"]],
  "Sar-e Pol": [["Balkhab","بلخاب"],["Gosfandi","گوسفندی"],["Kohestanat","کوهستانات"],["Sancharak","سانچارك"],["Sar-e-Pul","سرپل"],["Sayad","صیاد"],["Sozmaqala","سوزمه قلعه"]],
  "Takhar": [["Baharak","بهارک"],["Bangi","بنگی"],["Chahab","چاه آب"],["Chal","چال"],["Darqad","درقد"],["Dasht-e-Qala","دشت قلعه"],["Eshkmesh","اشکمش"],["Farkhar","فرخار"],["Hazar Sumuch","هزار سموچ"],["Kalafgan","کلفگان"],["Khwaja Bahawuddin","خواجه بهاوالدین"],["Khwaja Ghar","خواجه غار"],["Namak Ab","نمک آب"],["Rostaq","رُستاق"],["Taloqan","تالقان"],["Warsaj","ورسج"],["Yangi Qala","ینگی قلعه"]],
  "Urozgan": [["Chinarto","چنارتو"],["Chora","چوره"],["Dehrawud","دهراود"],["Gizab","گیزاب"],["Khas Uruzgan","خاص ارزگان"],["Shahid-e-Hassas","شهید حساس"],["Tirinkot","تیرینکوت"]],
  "Wardak": [["Chak-e-Wardak","چک"],["Daymirdad","دایمیرداد"],["Hesa-e-Awal-e-Behsud","حصه اول بهسود"],["Jaghatu","جغتو"],["Jalrez","جلریز"],["Markaz-e-Behsud","مدکز بهسود"],["Maydan Shahr","میدان شهر"],["Nerkh","نرخ"],["Saydabad","سید آباد"]],
  "Zabul": [["Arghandab","ارغنداب"],["Atghar","اتغر"],["Daychopan","دای چوپان"],["Kakar","کاکړ"],["Mizan","میزان"],["Nawbahar","نوبهار"],["Qalat","قلات"],["Shah Joi","شاه جوی"],["Shamul Zayi","شملزائی"],["Shinkay","شینکی"],["Tarnak Wa Jaldak","ترنک و جلدک"]],
};

export function districtOptionsForProvince(
  province: string,
  locale: "en" | "fa-AF" | "ps-AF"
): ReadonlyArray<{ value: string; label: string }> {
  if (!Object.prototype.hasOwnProperty.call(DISTRICTS_BY_PROVINCE, province)) return [];
  const districts = DISTRICTS_BY_PROVINCE[province as ProvinceName];
  return districts.map(([value, local]) => ({
    value,
    label: locale === "en" ? value : local
  }));
}
