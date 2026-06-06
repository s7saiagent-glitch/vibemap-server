export interface AuctionItem {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  conditionAr: string;
  conditionEn: string;
  provenanceAr: string;
  provenanceEn: string;
  currentBid: number;
  startingBid: number;
  reservePrice: number;
  bidIncrement: number;
  endTime: Date;
  isLive: boolean;
  attendees: number;
  imageUrl: string;
  images: string[];
  category: 'watch' | 'jewelry' | 'collectible';
  certified: boolean;
  featured: boolean;
}

const now = new Date();

export const AUCTION_ITEMS: AuctionItem[] = [
  {
    id: '1',
    nameAr: 'رولكس دايتونا ١٦٥٢٠',
    nameEn: 'Rolex Daytona 16520',
    descriptionAr: 'ساعة رولكس دايتونا الأسطورية، إصدار ١٩٩٢، هيكل من الستانلس ستيل مع مينا بيضاء نادرة. واحدة من أندر الإصدارات التي يبحث عنها هواة الساعات الفاخرة حول العالم.',
    descriptionEn: 'The legendary Rolex Daytona ref. 16520, 1992 edition, stainless steel case with rare white "inverted six" dial. One of the most sought-after references among serious watch collectors worldwide.',
    conditionAr: 'ممتازة جداً - مع الصندوق والوثائق الأصلية',
    conditionEn: 'Excellent - Full set with original box and papers',
    provenanceAr: 'مجموعة خاصة من جنيف، سويسرا. شهادة أصالة من Rolex SA.',
    provenanceEn: 'Private Geneva collection, Switzerland. Certificate of authenticity from Rolex SA.',
    currentBid: 285000,
    startingBid: 200000,
    reservePrice: 300000,
    bidIncrement: 5000,
    endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    isLive: true,
    attendees: 147,
    imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800',
    images: [
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800',
      'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800',
      'https://images.unsplash.com/photo-1609587312208-cea54be969e7?w=800',
    ],
    category: 'watch',
    certified: true,
    featured: true,
  },
  {
    id: '2',
    nameAr: 'باتيك فيليب نوتيلوس ٥٧١١',
    nameEn: 'Patek Philippe Nautilus 5711',
    descriptionAr: 'باتيك فيليب نوتيلوس المرجع ٥٧١١/١أ، مينا زرقاء مميزة. الساعة التي رفعت معيار الساعات الفاخرة إلى مستوى غير مسبوق. حركة أوتوماتيكية كاليبر ٣٢٤ إس سي.',
    descriptionEn: 'Patek Philippe Nautilus ref. 5711/1A-010, iconic blue dial. The timepiece that redefined luxury sports watches. Self-winding caliber 324 SC movement.',
    conditionAr: 'مينت - لم تُستخدم قط، كامل الملحقات',
    conditionEn: 'Mint - Unworn, complete set',
    provenanceAr: 'مباشرة من وكيل معتمد في جنيف ٢٠٢١',
    provenanceEn: 'Direct from authorized dealer Geneva, 2021',
    currentBid: 620000,
    startingBid: 500000,
    reservePrice: 650000,
    bidIncrement: 10000,
    endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    isLive: true,
    attendees: 284,
    imageUrl: 'https://images.unsplash.com/photo-1619134778706-7015533a6150?w=800',
    images: [
      'https://images.unsplash.com/photo-1619134778706-7015533a6150?w=800',
      'https://images.unsplash.com/photo-1551818255-e7b168f61ac1?w=800',
    ],
    category: 'watch',
    certified: true,
    featured: true,
  },
  {
    id: '3',
    nameAr: 'سوار الماس تنس',
    nameEn: 'Diamond Tennis Bracelet',
    descriptionAr: 'سوار تنس استثنائي من الذهب الأبيض عيار ١٨ قيراط، مرصع بـ ٤٢ حجرة ماس طبيعية بإجمالي وزن ١٥ قيراطاً. تصنيف اللون D، نقاء VVS1.',
    descriptionEn: 'Exceptional 18k white gold tennis bracelet set with 42 natural diamonds totaling 15 carats. D color grade, VVS1 clarity. GIA certified.',
    conditionAr: 'ممتازة - في حالة رائعة مع تقرير GIA',
    conditionEn: 'Excellent - Pristine condition with GIA report',
    provenanceAr: 'دار مجوهرات كارتييه، باريس ٢٠١٨',
    provenanceEn: 'Cartier Jewelry House, Paris, 2018',
    currentBid: 185000,
    startingBid: 150000,
    reservePrice: 200000,
    bidIncrement: 5000,
    endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000),
    isLive: false,
    attendees: 89,
    imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    images: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
      'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800',
    ],
    category: 'jewelry',
    certified: true,
    featured: false,
  },
  {
    id: '4',
    nameAr: 'أوديمار بيغيه رويال أوك',
    nameEn: 'Audemars Piguet Royal Oak',
    descriptionAr: 'أوديمار بيغيه رويال أوك المرجع ١٥٢٠٢، فولاذ مصقول مع مينا رمادية. تحفة فنية هندسية تجمع بين الأناقة والقوة في آن واحد.',
    descriptionEn: 'Audemars Piguet Royal Oak ref. 15202ST, polished steel with grey "petite tapisserie" dial. A geometric masterpiece blending elegance and power.',
    conditionAr: 'ممتازة جداً - مستعملة بعناية فائقة',
    conditionEn: 'Very Good - Carefully worn',
    provenanceAr: 'مجموعة خاصة، دبي',
    provenanceEn: 'Private collection, Dubai',
    currentBid: 410000,
    startingBid: 350000,
    reservePrice: 450000,
    bidIncrement: 10000,
    endTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    isLive: false,
    attendees: 156,
    imageUrl: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800',
    images: [
      'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800',
    ],
    category: 'watch',
    certified: true,
    featured: false,
  },
  {
    id: '5',
    nameAr: 'خاتم الخطوبة الماسي',
    nameEn: 'Diamond Engagement Ring',
    descriptionAr: 'خاتم من البلاتين ٩٥٠، يحتضن ماسة مركزية نادرة وزنها ٣.٢٨ قيراط، تصنيف E VS1، مقطوعة على شكل الوسادة. محاط بهالة من الماس الصغير.',
    descriptionEn: 'Platinum 950 ring featuring a rare 3.28ct center diamond, E color VS1 clarity, cushion cut. Surrounded by a halo of pavé diamonds.',
    conditionAr: 'مينت - جديدة تماماً',
    conditionEn: 'Mint - Brand new',
    provenanceAr: 'دار هاري وينستون، نيويورك',
    provenanceEn: 'Harry Winston, New York',
    currentBid: 95000,
    startingBid: 80000,
    reservePrice: 110000,
    bidIncrement: 2500,
    endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    isLive: false,
    attendees: 67,
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    images: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    ],
    category: 'jewelry',
    certified: true,
    featured: true,
  },
  {
    id: '6',
    nameAr: 'ريتشارد ميل RM 011',
    nameEn: 'Richard Mille RM 011',
    descriptionAr: 'ريتشارد ميل RM ٠١١ تيتانيوم، كرونوغراف متطور بهيكل من التيتانيوم والكربون. تحفة من عالم الساعات الفاخرة الحديثة، شهادة الأصالة ومنشأ موثق.',
    descriptionEn: 'Richard Mille RM 011 Titanium flyback chronograph, titanium and carbon case. A masterpiece of modern haute horlogerie with full provenance.',
    conditionAr: 'ممتازة - مع الصندوق والوثائق الكاملة',
    conditionEn: 'Excellent - Full set with box and papers',
    provenanceAr: 'مجموعة خاصة أوروبية، ٢٠٢٠',
    provenanceEn: 'European private collection, 2020',
    currentBid: 520000,
    startingBid: 450000,
    reservePrice: 580000,
    bidIncrement: 10000,
    endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    isLive: false,
    attendees: 203,
    imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
    images: [
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
    ],
    category: 'watch',
    certified: true,
    featured: false,
  },
];
