/**
 * Comprehensive Bangladesh Administrative Divisions, Districts, and Thanas/Upazilas Dataset
 * Standardized across SentinelX for Citizen Reporting, Police Jurisdiction Routing, and Admin Oversight.
 */

export interface BangladeshDivision {
  id: string;
  name: string;
  nameBn: string;
  districts: BangladeshDistrict[];
}

export interface BangladeshDistrict {
  id: string;
  name: string;
  nameBn: string;
  division: string;
  thanas: string[];
}

export const BANGLADESH_DIVISIONS: BangladeshDivision[] = [
  {
    id: 'dhaka',
    name: 'Dhaka',
    nameBn: 'ঢাকা',
    districts: [
      {
        id: 'dhaka',
        name: 'Dhaka',
        nameBn: 'ঢাকা',
        division: 'Dhaka',
        thanas: [
          'Gulshan',
          'Banani',
          'Dhanmondi',
          'Mirpur',
          'Uttara',
          'Mohammadpur',
          'Tejgaon',
          'Motijheel',
          'Ramna',
          'Paltan',
          'Shahbagh',
          'Badda',
          'Khilgaon',
          'Sabujbagh',
          'Lalbagh',
          'Hazaribagh',
          'Kamrangirchar',
          'Sutrapur',
          'Kotwali',
          'Wari',
          'Demra',
          'Jatrabari',
          'Kadamtali',
          'Cantonment',
          'Kafrul',
          'Kalabagan',
          'New Market',
          'Sher-e-Bangla Nagar',
          'Turag',
          'Uttarkhan',
          'Dakshinkhan',
          'Khilkhet',
          'Vatara',
          'Rampura',
          'Rupnagar',
          'Bhashantek',
          'Darus Salam',
          'Adabor',
          'Chawkbazar',
          'Gendaria',
          'Shyampur',
          'Mugda',
          'Hatirjheel',
          'Savar',
          'Dhamrai',
          'Keraniganj',
          'Dohar',
          'Nawabganj'
        ]
      },
      {
        id: 'gazipur',
        name: 'Gazipur',
        nameBn: 'গাজীপুর',
        division: 'Dhaka',
        thanas: [
          'Gazipur Sadar',
          'Joydebpur',
          'Tongi East',
          'Tongi West',
          'Kaliakair',
          'Kaliganj',
          'Kapasia',
          'Sreepur',
          'Gacha',
          'Bason',
          'Konabari',
          'Kasimpur'
        ]
      },
      {
        id: 'narayanganj',
        name: 'Narayanganj',
        nameBn: 'নারায়ণগঞ্জ',
        division: 'Dhaka',
        thanas: [
          'Narayanganj Sadar',
          'Fatullah',
          'Siddhirganj',
          'Bandar',
          'Araihazar',
          'Sonargaon',
          'Rupganj'
        ]
      },
      {
        id: 'narsingdi',
        name: 'Narsingdi',
        nameBn: 'নরসিংদী',
        division: 'Dhaka',
        thanas: [
          'Narsingdi Sadar',
          'Belabo',
          'Monohardi',
          'Palash',
          'Raipura',
          'Shibpur',
          'Madhabdi'
        ]
      },
      {
        id: 'tangail',
        name: 'Tangail',
        nameBn: 'টাঙ্গাইল',
        division: 'Dhaka',
        thanas: [
          'Tangail Sadar',
          'Basail',
          'Bhuapur',
          'Delduar',
          'Dhanbari',
          'Ghatail',
          'Gopalpur',
          'Kalihati',
          'Madhupur',
          'Mirzapur',
          'Nagarpur',
          'Sakhipur'
        ]
      },
      {
        id: 'kishoreganj',
        name: 'Kishoreganj',
        nameBn: 'কিশোরগঞ্জ',
        division: 'Dhaka',
        thanas: [
          'Kishoreganj Sadar',
          'Bajitpur',
          'Bhairab',
          'Hossainpur',
          'Itna',
          'Karimganj',
          'Katiadi',
          'Kuliarchar',
          'Mithamain',
          'Nikli',
          'Pakundia',
          'Tarail',
          'Austagram'
        ]
      },
      {
        id: 'manikganj',
        name: 'Manikganj',
        nameBn: 'মানিকগঞ্জ',
        division: 'Dhaka',
        thanas: [
          'Manikganj Sadar',
          'Singair',
          'Shibalaya',
          'Saturia',
          'Harirampur',
          'Ghior',
          'Daulatpur'
        ]
      },
      {
        id: 'munshiganj',
        name: 'Munshiganj',
        nameBn: 'মুন্সীগঞ্জ',
        division: 'Dhaka',
        thanas: [
          'Munshiganj Sadar',
          'Tongibari',
          'Serajdikhan',
          'Louhajang',
          'Gazaria',
          'Sreenagar'
        ]
      },
      {
        id: 'faridpur',
        name: 'Faridpur',
        nameBn: 'ফরিদপুর',
        division: 'Dhaka',
        thanas: [
          'Faridpur Sadar',
          'Boalmari',
          'Alfadanga',
          'Madhukhali',
          'Bhanga',
          'Nagarkanda',
          'Charbhadrasan',
          'Sadarpur',
          'Saltha'
        ]
      },
      {
        id: 'madaripur',
        name: 'Madaripur',
        nameBn: 'মাদারীপুর',
        division: 'Dhaka',
        thanas: ['Madaripur Sadar', 'Shibchar', 'Kalkini', 'Rajoir', 'Dasar']
      },
      {
        id: 'gopalganj',
        name: 'Gopalganj',
        nameBn: 'গোপালগঞ্জ',
        division: 'Dhaka',
        thanas: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara']
      },
      {
        id: 'rajbari',
        name: 'Rajbari',
        nameBn: 'রাজবাড়ী',
        division: 'Dhaka',
        thanas: ['Rajbari Sadar', 'Goalanda', 'Pangsha', 'Baliakandi', 'Kalukhali']
      },
      {
        id: 'shariatpur',
        name: 'Shariatpur',
        nameBn: 'শরীয়তপুর',
        division: 'Dhaka',
        thanas: ['Shariatpur Sadar', 'Damudya', 'Naria', 'Jajira', 'Bhedarganj', 'Gosairhat']
      }
    ]
  },
  {
    id: 'mymensingh',
    name: 'Mymensingh',
    nameBn: 'ময়মনসিংহ',
    districts: [
      {
        id: 'mymensingh',
        name: 'Mymensingh',
        nameBn: 'ময়মনসিংহ',
        division: 'Mymensingh',
        thanas: [
          'Fulbaria',
          'Trishal',
          'Bhaluka',
          'Muktagacha',
          'Mymensingh Sadar',
          'Gafargaon',
          'Ishwarganj',
          'Haluaghat',
          'Dhobaura',
          'Nandail',
          'Phulpur',
          'Tarakanda'
        ]
      },
      {
        id: 'jamalpur',
        name: 'Jamalpur',
        nameBn: 'জামালপুর',
        division: 'Mymensingh',
        thanas: [
          'Jamalpur Sadar',
          'Bakshiganj',
          'Dewanganj',
          'Islampur',
          'Madarganj',
          'Melandaha',
          'Sarishabari'
        ]
      },
      {
        id: 'netrokona',
        name: 'Netrokona',
        nameBn: 'নেত্রকোণা',
        division: 'Mymensingh',
        thanas: [
          'Netrokona Sadar',
          'Atpara',
          'Barhatta',
          'Durgapur',
          'Kalmakanda',
          'Kendua',
          'Madan',
          'Mohanganj',
          'Purbadhala',
          'Khaliajuri'
        ]
      },
      {
        id: 'sherpur',
        name: 'Sherpur',
        nameBn: 'শেরপুর',
        division: 'Mymensingh',
        thanas: ['Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebardi']
      }
    ]
  },
  {
    id: 'chattogram',
    name: 'Chattogram',
    nameBn: 'চট্টগ্রাম',
    districts: [
      {
        id: 'chattogram',
        name: 'Chattogram',
        nameBn: 'চট্টগ্রাম',
        division: 'Chattogram',
        thanas: [
          'Kotwali',
          'Panchlaish',
          'Agrabad',
          'Double Mooring',
          'Khulshi',
          'Pahartali',
          'Halishahar',
          'Patenga',
          'Chandgaon',
          'Bayazid',
          'Bakalia',
          'Chawkbazar',
          'Sadarghat',
          'EPZ',
          'Karnaphuli',
          'Anwara',
          'Banshkhali',
          'Boalkhali',
          'Chandanaish',
          'Fatikchhari',
          'Hathazari',
          'Lohagara',
          'Mirsharai',
          'Patiya',
          'Rangunia',
          'Raozan',
          'Sandwip',
          'Satkania',
          'Sitakunda'
        ]
      },
      {
        id: 'coxs-bazar',
        name: "Cox's Bazar",
        nameBn: 'কক্সবাজার',
        division: 'Chattogram',
        thanas: [
          "Cox's Bazar Sadar",
          'Chakaria',
          'Maheshkhali',
          'Teknaf',
          'Ukhiya',
          'Ramu',
          'Pekua',
          'Kutubdia',
          'Eidgaon'
        ]
      },
      {
        id: 'cumilla',
        name: 'Cumilla',
        nameBn: 'কুমিল্লা',
        division: 'Chattogram',
        thanas: [
          'Cumilla Adarsha Sadar',
          'Cumilla Sadar Dakshin',
          'Barura',
          'Brahmanpara',
          'Burichang',
          'Chandina',
          'Chauddagram',
          'Daudkandi',
          'Debidwar',
          'Homna',
          'Laksam',
          'Muradnagar',
          'Nangalkot',
          'Meghna',
          'Titas',
          'Monohargonj',
          'Lalmai'
        ]
      },
      {
        id: 'feni',
        name: 'Feni',
        nameBn: 'ফেনী',
        division: 'Chattogram',
        thanas: [
          'Feni Sadar',
          'Daganbhuiyan',
          'Chhagalnaiya',
          'Sonagazi',
          'Parshuram',
          'Fulgazi'
        ]
      },
      {
        id: 'brahmanbaria',
        name: 'Brahmanbaria',
        nameBn: 'ব্রাহ্মণবাড়িয়া',
        division: 'Chattogram',
        thanas: [
          'Brahmanbaria Sadar',
          'Ashuganj',
          'Bancharampur',
          'Kasba',
          'Nabinagar',
          'Nasirnagar',
          'Sarail',
          'Akhaura',
          'Bijoynagar'
        ]
      },
      {
        id: 'noakhali',
        name: 'Noakhali',
        nameBn: 'নোয়াখালী',
        division: 'Chattogram',
        thanas: [
          'Noakhali Sadar (Sudharam)',
          'Begumganj',
          'Chatkhil',
          'Companiganj',
          'Hatiya',
          'Senbagh',
          'Sonaimuri',
          'Subarnachar',
          'Kabirhat'
        ]
      },
      {
        id: 'chandpur',
        name: 'Chandpur',
        nameBn: 'চাঁদপুর',
        division: 'Chattogram',
        thanas: [
          'Chandpur Sadar',
          'Faridganj',
          'Haimchar',
          'Haziganj',
          'Kachua',
          'Matlab Dakshin',
          'Matlab Uttar',
          'Shahrasti'
        ]
      },
      {
        id: 'lakshmipur',
        name: 'Lakshmipur',
        nameBn: 'লক্ষ্মীপুর',
        division: 'Chattogram',
        thanas: ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati', 'Kamalnagar']
      },
      {
        id: 'rangamati',
        name: 'Rangamati',
        nameBn: 'রাঙ্গামাটি',
        division: 'Chattogram',
        thanas: [
          'Rangamati Sadar',
          'Baghaichhari',
          'Barkal',
          'Belaichhari',
          'Juraichhari',
          'Kaptai',
          'Kawkhali',
          'Langadu',
          'Naniarchar',
          'Rajasthali'
        ]
      },
      {
        id: 'khagrachhari',
        name: 'Khagrachhari',
        nameBn: 'খাগড়াছড়ি',
        division: 'Chattogram',
        thanas: [
          'Khagrachhari Sadar',
          'Dighinala',
          'Lakshmichhari',
          'Mahalchhari',
          'Manikchhari',
          'Matiranga',
          'Panchhari',
          'Ramgarh',
          'Guimara'
        ]
      },
      {
        id: 'bandarban',
        name: 'Bandarban',
        nameBn: 'বান্দরবান',
        division: 'Chattogram',
        thanas: [
          'Bandarban Sadar',
          'Alikadam',
          'Naikhyongchhari',
          'Rowangchhari',
          'Ruma',
          'Thanchi',
          'Lama'
        ]
      }
    ]
  },
  {
    id: 'rajshahi',
    name: 'Rajshahi',
    nameBn: 'রাজশাহী',
    districts: [
      {
        id: 'rajshahi',
        name: 'Rajshahi',
        nameBn: 'রাজশাহী',
        division: 'Rajshahi',
        thanas: [
          'Boalia',
          'Motihar',
          'Rajpara',
          'Shah Makhdum',
          'Chandrima',
          'Kashiadanga',
          'Katakhali',
          'Belpukur',
          'Airport',
          'Paba',
          'Durgapur',
          'Godagari',
          'Charghat',
          'Bagha',
          'Bagmara',
          'Tanore',
          'Mohanpur',
          'Puthia'
        ]
      },
      {
        id: 'bogura',
        name: 'Bogura',
        nameBn: 'বগুড়া',
        division: 'Rajshahi',
        thanas: [
          'Bogura Sadar',
          'Adamdighi',
          'Dhunat',
          'Dhupchanchia',
          'Gabtali',
          'Kahaloo',
          'Nandigram',
          'Sariakandi',
          'Shajahanpur',
          'Sherpur',
          'Shibganj',
          'Sonatala'
        ]
      },
      {
        id: 'pabna',
        name: 'Pabna',
        nameBn: 'পাবনা',
        division: 'Rajshahi',
        thanas: [
          'Pabna Sadar',
          'Atgharia',
          'Bera',
          'Bhangoora',
          'Chatmohar',
          'Faridpur',
          'Ishwardi',
          'Santhia',
          'Sujanagar'
        ]
      },
      {
        id: 'sirajganj',
        name: 'Sirajganj',
        nameBn: 'সিরাজগঞ্জ',
        division: 'Rajshahi',
        thanas: [
          'Sirajganj Sadar',
          'Belkuchi',
          'Chauhali',
          'Kamarkhanda',
          'Kazipur',
          'Raiganj',
          'Shahjadpur',
          'Tarash',
          'Ullahpara'
        ]
      },
      {
        id: 'naogaon',
        name: 'Naogaon',
        nameBn: 'নওগাঁ',
        division: 'Rajshahi',
        thanas: [
          'Naogaon Sadar',
          'Atrai',
          'Badalgachhi',
          'Dhamoirhat',
          'Manda',
          'Mohadevpur',
          'Niamatpur',
          'Patnitala',
          'Porsha',
          'Raninagar',
          'Sapahar'
        ]
      },
      {
        id: 'natore',
        name: 'Natore',
        nameBn: 'নাটোর',
        division: 'Rajshahi',
        thanas: [
          'Natore Sadar',
          'Bagatipara',
          'Baraigram',
          'Gurudaspur',
          'Lalpur',
          'Singra',
          'Naldanga'
        ]
      },
      {
        id: 'chapainawabganj',
        name: 'Chapainawabganj',
        nameBn: 'চাঁপাইনবাবগঞ্জ',
        division: 'Rajshahi',
        thanas: [
          'Chapainawabganj Sadar',
          'Bholahat',
          'Gomastapur',
          'Nachole',
          'Shibganj'
        ]
      },
      {
        id: 'joypurhat',
        name: 'Joypurhat',
        nameBn: 'জয়পুরহাট',
        division: 'Rajshahi',
        thanas: ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi']
      }
    ]
  },
  {
    id: 'khulna',
    name: 'Khulna',
    nameBn: 'খুলনা',
    districts: [
      {
        id: 'khulna',
        name: 'Khulna',
        nameBn: 'খুলনা',
        division: 'Khulna',
        thanas: [
          'Khulna Sadar',
          'Sonadanga',
          'Khalishpur',
          'Daulatpur',
          'Khan Jahan Ali',
          'Harintana',
          'Aranghata',
          'Batiaghata',
          'Dacope',
          'Dumuria',
          'Dighalia',
          'Koyra',
          'Paikgachha',
          'Phultala',
          'Rupsha',
          'Terokhada'
        ]
      },
      {
        id: 'jashore',
        name: 'Jashore',
        nameBn: 'যশোর',
        division: 'Khulna',
        thanas: [
          'Jashore Sadar',
          'Abhaynagar',
          'Bagherpara',
          'Chaugachha',
          'Jhikargachha',
          'Keshabpur',
          'Manirampur',
          'Sharsha',
          'Benapole Port'
        ]
      },
      {
        id: 'satkhira',
        name: 'Satkhira',
        nameBn: 'সাতক্ষীরা',
        division: 'Khulna',
        thanas: [
          'Satkhira Sadar',
          'Assasuni',
          'Debhata',
          'Kalaroa',
          'Kaliganj',
          'Shyamnagar',
          'Tala'
        ]
      },
      {
        id: 'kushtia',
        name: 'Kushtia',
        nameBn: 'কুষ্টিয়া',
        division: 'Khulna',
        thanas: [
          'Kushtia Sadar',
          'Bheramara',
          'Daulatpur',
          'Khoksa',
          'Kumarkhali',
          'Mirpur',
          'Islamic University'
        ]
      },
      {
        id: 'jhenaidah',
        name: 'Jhenaidah',
        nameBn: 'ঝিনাইদহ',
        division: 'Khulna',
        thanas: [
          'Jhenaidah Sadar',
          'Harinakundu',
          'Kaliganj',
          'Kotchandpur',
          'Maheshpur',
          'Shailkupa'
        ]
      },
      {
        id: 'chuadanga',
        name: 'Chuadanga',
        nameBn: 'চুয়াডাঙ্গা',
        division: 'Khulna',
        thanas: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar', 'Darshana']
      },
      {
        id: 'meherpur',
        name: 'Meherpur',
        nameBn: 'মেহেরপুর',
        division: 'Khulna',
        thanas: ['Meherpur Sadar', 'Gangni', 'Mujibnagar']
      },
      {
        id: 'magura',
        name: 'Magura',
        nameBn: 'মাগুরা',
        division: 'Khulna',
        thanas: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur']
      },
      {
        id: 'narail',
        name: 'Narail',
        nameBn: 'নড়াইল',
        division: 'Khulna',
        thanas: ['Narail Sadar', 'Kalia', 'Lohagara', 'Naragati']
      },
      {
        id: 'bagerhat',
        name: 'Bagerhat',
        nameBn: 'বাগেরহাট',
        division: 'Khulna',
        thanas: [
          'Bagerhat Sadar',
          'Chitalmari',
          'Fakirhat',
          'Kachua',
          'Mollahat',
          'Mongla',
          'Morrelganj',
          'Rampal',
          'Sarankhola'
        ]
      }
    ]
  },
  {
    id: 'barishal',
    name: 'Barishal',
    nameBn: 'বরিশাল',
    districts: [
      {
        id: 'barishal',
        name: 'Barishal',
        nameBn: 'বরিশাল',
        division: 'Barishal',
        thanas: [
          'Barishal Sadar (Kotwali)',
          'Airport',
          'Kawnia',
          'Bandar',
          'Agailjhara',
          'Babuganj',
          'Bakerganj',
          'Banaripara',
          'Gaurnadi',
          'Hizla',
          'Mehendiganj',
          'Muladi',
          'Wazirpur'
        ]
      },
      {
        id: 'patuakhali',
        name: 'Patuakhali',
        nameBn: 'পটুয়াখালী',
        division: 'Barishal',
        thanas: [
          'Patuakhali Sadar',
          'Bauphal',
          'Dashmina',
          'Galachipa',
          'Kalapara',
          'Mirzaganj',
          'Rangabali',
          'Dumki',
          'Mohipur'
        ]
      },
      {
        id: 'bhola',
        name: 'Bhola',
        nameBn: 'ভোলা',
        division: 'Barishal',
        thanas: [
          'Bhola Sadar',
          'Burhanuddin',
          'Char Fasson',
          'Daulatkhan',
          'Lalmohan',
          'Manpura',
          'Tazumuddin',
          'Dularhat',
          'Shashibhusan'
        ]
      },
      {
        id: 'pirojpur',
        name: 'Pirojpur',
        nameBn: 'পিরোজপুর',
        division: 'Barishal',
        thanas: [
          'Pirojpur Sadar',
          'Bhandaria',
          'Kawkhali',
          'Mathbaria',
          'Nazirpur',
          'Nesarabad (Swarupkati)',
          'Zianagar (Indurkani)'
        ]
      },
      {
        id: 'barguna',
        name: 'Barguna',
        nameBn: 'বরগুনা',
        division: 'Barishal',
        thanas: ['Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Patharghata', 'Taltali']
      },
      {
        id: 'jhalokathi',
        name: 'Jhalokathi',
        nameBn: 'ঝালকাঠি',
        division: 'Barishal',
        thanas: ['Jhalokathi Sadar', 'Kathalia', 'Nalchity', 'Rajapur']
      }
    ]
  },
  {
    id: 'sylhet',
    name: 'Sylhet',
    nameBn: 'সিলেট',
    districts: [
      {
        id: 'sylhet',
        name: 'Sylhet',
        nameBn: 'সিলেট',
        division: 'Sylhet',
        thanas: [
          'Sylhet Sadar (Kotwali)',
          'Jalalabad',
          'Airport',
          'Moglabazar',
          'Shahporan',
          'Osmani Nagar',
          'South Surma',
          'Balaganj',
          'Beanibazar',
          'Bishwanath',
          'Companiganj',
          'Fenchuganj',
          'Golapganj',
          'Gowainghat',
          'Jaintiapur',
          'Kanaighat',
          'Zakiganj'
        ]
      },
      {
        id: 'moulvibazar',
        name: 'Moulvibazar',
        nameBn: 'মৌলভীবাজার',
        division: 'Sylhet',
        thanas: [
          'Moulvibazar Sadar',
          'Barlekha',
          'Juri',
          'Kamalganj',
          'Kulaura',
          'Rajnagar',
          'Sreemangal'
        ]
      },
      {
        id: 'habiganj',
        name: 'Habiganj',
        nameBn: 'হবিগঞ্জ',
        division: 'Sylhet',
        thanas: [
          'Habiganj Sadar',
          'Ajmiriganj',
          'Bahubal',
          'Baniyachong',
          'Chunarughat',
          'Lakhai',
          'Madhabpur',
          'Nabiganj',
          'Sayestaganj'
        ]
      },
      {
        id: 'sunamganj',
        name: 'Sunamganj',
        nameBn: 'সুনামগঞ্জ',
        division: 'Sylhet',
        thanas: [
          'Sunamganj Sadar',
          'Bishwamvarpur',
          'Chhatak',
          'Derai',
          'Dharamapasha',
          'Dowarabazar',
          'Jagannathpur',
          'Jamalganj',
          'Sullah',
          'Tahirpur',
          'Shanthiganj',
          'Madhyanagar'
        ]
      }
    ]
  },
  {
    id: 'rangpur',
    name: 'Rangpur',
    nameBn: 'রংপুর',
    districts: [
      {
        id: 'rangpur',
        name: 'Rangpur',
        nameBn: 'রংপুর',
        division: 'Rangpur',
        thanas: [
          'Rangpur Sadar (Kotwali)',
          'Tajhat',
          'Haragach',
          'Mahiganj',
          'Parshuram',
          'Hazirhat',
          'Badarganj',
          'Gangachhara',
          'Kaunia',
          'Mithapukur',
          'Pirgachha',
          'Pirganj',
          'Taraganj'
        ]
      },
      {
        id: 'dinajpur',
        name: 'Dinajpur',
        nameBn: 'দিনাজপুর',
        division: 'Rangpur',
        thanas: [
          'Dinajpur Sadar',
          'Birampur',
          'Birganj',
          'Birol',
          'Bochaganj',
          'Chirirbandar',
          'Phulbari',
          'Ghoraghat',
          'Hakimpur',
          'Kaharole',
          'Khansama',
          'Nawabganj',
          'Parbatipur'
        ]
      },
      {
        id: 'kurigram',
        name: 'Kurigram',
        nameBn: 'কুড়িগ্রাম',
        division: 'Rangpur',
        thanas: [
          'Kurigram Sadar',
          'Bhurungamari',
          'Char Rajibpur',
          'Chilmari',
          'Phulbari',
          'Nageshwari',
          'Rajarhat',
          'Raomari',
          'Ulipur',
          'Kachakata'
        ]
      },
      {
        id: 'gaibandha',
        name: 'Gaibandha',
        nameBn: 'গাইবান্ধা',
        division: 'Rangpur',
        thanas: [
          'Gaibandha Sadar',
          'Phulchhari',
          'Gobindaganj',
          'Palashbari',
          'Sadullapur',
          'Sughatta',
          'Sundarganj'
        ]
      },
      {
        id: 'nilphamari',
        name: 'Nilphamari',
        nameBn: 'নীলফামারী',
        division: 'Rangpur',
        thanas: [
          'Nilphamari Sadar',
          'Dimla',
          'Domar',
          'Jaldhaka',
          'Kishoreganj',
          'Saidpur'
        ]
      },
      {
        id: 'lalmonirhat',
        name: 'Lalmonirhat',
        nameBn: 'লালমনিরহাট',
        division: 'Rangpur',
        thanas: ['Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Kaliganj', 'Patgram']
      },
      {
        id: 'thakurgaon',
        name: 'Thakurgaon',
        nameBn: 'ঠাকুরগাঁও',
        division: 'Rangpur',
        thanas: [
          'Thakurgaon Sadar',
          'Baliadangi',
          'Haripur',
          'Pirganj',
          'Ranisankail',
          'Ruhea'
        ]
      },
      {
        id: 'panchagarh',
        name: 'Panchagarh',
        nameBn: 'পঞ্চগড়',
        division: 'Rangpur',
        thanas: ['Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia']
      }
    ]
  }
];

// Helper Lookups
export const ALL_DISTRICTS: BangladeshDistrict[] = BANGLADESH_DIVISIONS.flatMap(d => d.districts);

export const ALL_DISTRICT_NAMES: string[] = ALL_DISTRICTS.map(d => d.name).sort();

export const DISTRICT_MAP = new Map<string, BangladeshDistrict>(
  ALL_DISTRICTS.map(d => [d.name.toLowerCase(), d])
);

export function getDistrictsByDivision(divisionName?: string): BangladeshDistrict[] {
  if (!divisionName) return ALL_DISTRICTS;
  const div = BANGLADESH_DIVISIONS.find(
    d => d.name.toLowerCase() === divisionName.toLowerCase()
  );
  return div ? div.districts : ALL_DISTRICTS;
}

export function getThanasByDistrict(districtName: string): string[] {
  if (!districtName) return [];
  const dist = DISTRICT_MAP.get(districtName.toLowerCase().trim());
  if (dist) return dist.thanas;

  // Fallback partial match if district name differs slightly (e.g. "Cox's Bazar")
  const matched = ALL_DISTRICTS.find(
    d => d.name.toLowerCase().includes(districtName.toLowerCase().trim()) ||
         districtName.toLowerCase().trim().includes(d.name.toLowerCase())
  );
  return matched ? matched.thanas : ['Kotwali', 'Sadar'];
}

export function findDistrictForThana(thanaName: string): string | null {
  if (!thanaName) return null;
  const clean = thanaName.toLowerCase().trim();
  for (const d of ALL_DISTRICTS) {
    if (d.thanas.some(t => t.toLowerCase() === clean)) {
      return d.name;
    }
  }
  return null;
}
