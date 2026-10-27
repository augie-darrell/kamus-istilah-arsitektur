(function(root){
  'use strict';
  const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  const themes=[
    ['doors','Pintu',/\b(door\w*|pintu|deur|klampdeur|trapdoor)\b/,['Door','Pintu','Deur'],/\b(indoor|outdoor|next door|doorloop|doorsnede)\b/],
    ['windows','Jendela',/\b(window\w*|jendela|raam|ramen|fenestration|casement|sash)\b/,['Window','Jendela','Raam']],
    ['walls','Dinding',/\b(wall\w*|dinding|muur|partition|partisi|sekat)\b/,['Wall','Dinding','Partition'],/\bwall street\b/],
    ['roofs','Atap',/\b(roof\w*|atap|dak|zadeldak|plattedak|rafter|purlin|gording|ridge|nok|talang)\b/,['Roof','Atap','Rafter']],
    ['floors','Lantai',/\b(floor\w*|lantai|vloer|tile|tegel|ubin)\b/,['Floor','Lantai','Tile'],/\bfloor price\b/],
    ['ceilings','Langit-langit',/\b(ceiling|plafon|plafond|langit langit|soffit)\b/,['Ceiling','Plafon','Soffit']],
    ['stairs','Tangga',/\b(stair\w*|tangga|trap|riser|tread|bordes|balustrade|handrail)\b/,['Stair','Tangga','Staircase']],
    ['frames','Rangka & struktur',/\b(frame\w*|rangka|struktur|structure|structural|truss|kuda kuda|portal|bracing|balok|beam|kolom|column|girder|joist)\b/,['Frame','Structure','Rangka']],
    ['foundations','Fondasi & tanah',/\b(foundation|fondasi|pondasi|footing|pile|piling|tiang|soil|tanah|geotechnical|caisson|bored)\b/,['Foundation','Pondasi','Soil']],
    ['concrete','Beton',/\b(concrete|beton\w*|reinforced|reinforcement|tulangan|formwork|bekisting|cement|semen|mortar|grout|acuan)\b/,['Concrete','Beton','Formwork']],
    ['steel','Baja & logam',/\b(steel|baja|iron|besi|ijzer|metal|logam|aluminium|aluminum|copper|tembaga|brass|kuningan|zinc|seng)\b/,['Steel','Baja','Metal']],
    ['timber','Kayu',/\b(timber|wood\w*|kayu|hout|plywood|veneer|papan|plank|lumber|teak|bamboo|bambu)\b/,['Wood','Timber','Kayu']],
    ['masonry','Bata & batu',/\b(brick\w*|bata|masonry|metselwerk|stone\w*|batu|granite|granit|marble|marmer|limestone)\b/,['Brick','Bata','Stone']],
    ['glass','Kaca',/\b(glass|glazing|kaca|glas|glazier)\b/,['Glass','Kaca','Glazing']],
    ['finishes','Pelapis & penyelesaian',/\b(paint\w*|cat|coating|finish\w*|plaster|plester|render|cladding|pelapis|texture|tekstur|varnish|lacquer)\b/,['Paint','Finish','Plaster']],
    ['hardware','Sambungan & perangkat',/\b(hinge|engsel|lock\w*|kunci|bolt|baut|nut|mur|screw|sekrup|fastener|joint|sambungan|sealant|gasket|adhesive|perekat|latch)\b/,['Joint','Sambungan','Hinge']],
    ['water','Air & perpipaan',/\b(water|air bersih|pipa|pipe\w*|plumbing|valve|katup|pump|pompa|tap|faucet|keran|reservoir|tandon|tank|tangki)\b/,['Pipe','Pipa','Water']],
    ['drainage','Drainase & sanitasi',/\b(drain\w*|drainase|sewer|sewage|limbah|sanitary|sanitasi|toilet|closet|latrine|septic|wastewater|washbasin|sink|wastafel|selokan)\b/,['Drain','Drainage','Toilet']],
    ['electrical','Kelistrikan',/\b(electric\w*|listrik|electrical|cable|kabel|wire|voltage|tegangan|switch|saklar|transformer|trafo|generator|circuit|arus listrik)\b/,['Electricity','Electrical','Cable']],
    ['lighting','Pencahayaan',/\b(light\w*|lighting|lamp\w*|lampu|cahaya|pencahayaan|penerangan|illumin\w*|luminaire|daylight|licht)\b/,['Lighting','Light','Lamp'],/\blight\b.*\bringan\b/],
    ['hvac','Udara & penghawaan',/\b(ventilation|ventilasi|hvac|air conditioning|penghawaan|pendingin|cooling|heating|pemanas|udara|duct|chiller|boiler|fan|kipas)\b/,['Ventilation','Air Conditioning','Cooling']],
    ['fire','Kebakaran & evakuasi',/\b(fire\w*|kebakaran|api|sprinkler|extinguisher|hydrant|hidran|evacuation|evakuasi|escape|darurat)\b/,['Fire','Fire Protection','Sprinkler']],
    ['landscape','Lansekap & taman',/\b(landscape|lansekap|garden|taman|tree|pohon|planting|lawn|rumput|vegetation|vegetasi|park|kebun|hedge|pergola)\b/,['Landscape','Lansekap','Garden']],
    ['site','Tapak & pekerjaan tanah',/\b(site|tapak|earthwork|excavation|galian|urugan|cut and fill|grading|topography|topografi|contour|kontur|survey|survai)\b/,['Site','Tapak','Excavation']],
    ['roads','Jalan & jembatan',/\b(road\w*|jalan|street|pavement|perkerasan|asphalt|aspal|bridge|jembatan|kerb|curb|trotoar|sidewalk|highway)\b/,['Road','Jalan','Bridge']],
    ['urban','Kota & permukiman',/\b(urban|kota|city|town|permukiman|perumahan|housing|settlement|zoning|zonasi|neighborhood|neighbourhood|village|desa|kampung)\b/,['City','Kota','Housing']],
    ['spaces','Ruang & bangunan',/\b(room|ruang|space|gedung|building|bangunan|house|rumah|hall|lobby|lobi|atrium|apartment|apartemen|hotel|school|sekolah|hospital|kantor|office)\b/,['Room','Ruang','Building']],
    ['furniture','Furnitur',/\b(furniture|furnitur|mebel|chair|kursi|table|meja|desk|cabinet|lemari|cupboard|bed|tempat tidur|bench|bangku|shelf|rak)\b/,['Furniture','Chair','Table']],
    ['tools','Alat & perkakas',/\b(tool\w*|perkakas|hammer|palu|saw|gergaji|drill|bor|screwdriver|obeng|wrench|spanner|pliers|tang|trowel|cetok|chisel|pahat)\b/,['Tool','Hammer','Drill']],
    ['machines','Mesin & peralatan',/\b(machine\w*|mesin|equipment|peralatan|crane|keran angkat|excavator|backhoe|bulldozer|loader|scaffold\w*|perancah|hoist|lift|elevator)\b/,['Equipment','Machine','Crane']],
    ['drawing','Gambar & dokumentasi',/\b(drawing|gambar|blueprint|blue print|plan|denah|elevation|tampak|section|potongan|detail|schedule|daftar|specification|spesifikasi|cad|bim|model)\b/,['Drawing','Gambar','Plan']],
    ['design','Arsitektur & perancangan',/\b(architecture|arsitektur|architectural|design|desain|perancangan|rancangan|composition|komposisi|proportion|proporsi|aesthetic|estetika|style|gaya|vernacular|vernakular)\b/,['Architecture','Arsitektur','Design']],
    ['contracts','Kontrak & pengadaan',/\b(contract\w*|kontrak|tender|bid\w*|lelang|procurement|pengadaan|agreement|perjanjian|clause|klausul|addendum|adendum|bond|jaminan)\b/,['Contract','Kontrak','Tender']],
    ['management','Manajemen proyek',/\b(project|proyek|management|manajemen|planning|perencanaan|progress|kemajuan|work|kerja|construction|konstruksi|quality|mutu|inspection|inspeksi)\b/,['Project','Proyek','Management']],
    ['finance','Biaya & keuangan',/\b(cost|biaya|price|harga|finance|financial|keuangan|cash|kas|payment|pembayaran|budget|anggaran|interest|bunga bank|loan|pinjaman|account|accounting|akuntansi|profit|laba)\b/,['Cost','Biaya','Price']],
    ['measurement','Ukuran & satuan',/\b(measure\w*|ukur|ukuran|satuan|unit|meter|metre|liter|litre|gallon|galon|inch|inci|foot|feet|kg|kilogram|dimension|dimensi|area|luas|volume|volumetric|length|panjang)\b/,['Measurement','Satuan','Unit']],
    ['environment','Lingkungan & iklim',/\b(environment\w*|lingkungan|sustainable|berkelanjutan|green|hijau|climate|iklim|energy|energi|solar|surya|thermal|termal|ecology|ekologi)\b/,['Environment','Lingkungan','Climate']],
    ['acoustics','Akustik',/\b(acoustic\w*|akustik|sound|suara|noise|bising|kebisingan|reverberation|gema)\b/,['Acoustic','Akustik','Sound']],
    ['safety','Keselamatan',/\b(safety|keselamatan|security|keamanan|hazard|bahaya|risk|risiko|protect\w*|perlindungan|accident|kecelakaan)\b/,['Safety','Security','Risk']],
    ['people','Pelaku & organisasi',/\b(architect|arsitek|engineer|insinyur|contractor|kontraktor|consultant|konsultan|client|owner|pemilik|worker|pekerja|tukang|organization|organisasi|company|perusahaan)\b/,['Architect','Engineer','Contractor']],
    ['transport','Transportasi',/\b(transport\w*|transportasi|vehicle|kendaraan|car|mobil|parking|parkir|rail|kereta|airport|bandara|harbour|harbor|pelabuhan|bus|bicycle|sepeda)\b/,['Transport','Vehicle','Parking']],
    ['geometry','Bentuk & geometri',/\b(geometry|geometri|shape|bentuk|angle|sudut|circle|lingkaran|curve|kurva|arc|busur|line|garis|plane|bidang|axis|sumbu|symmetry|simetri)\b/,['Shape','Geometry','Bentuk']]
  ];
  const stop=new Set(('ind ing bld per jw sd lat kb kk aj ks mis lih dan atau yang untuk dengan dari pada dalam ke di adalah juga suatu sebagai berupa dapat akan oleh antara lebih tidak ini itu merupakan atau biasanya the a an of on in for to with from by and or is are as at into also type used use such one two three ada atas bawah tiap setiap maupun sangat serta bagian jenis bentuk tempat al dsb dst dll dkk misalnya contohnya yaitu menjadi mempunyai memiliki terdapat terdiri umumnya khusus tertentu salah satu kata istilah berarti lihat terkait').split(' '));
  // Broad editorial parents, guided by the supplied July 2026 Uniclass tables.
  // These labels organize dictionary navigation; they are not official code mappings.
  const categories=[
    {id:'materials',label:'Material',inspired_by:['Ma']},
    {id:'elements',label:'Elemen bangunan',inspired_by:['EF']},
    {id:'services',label:'Utilitas & fungsi',inspired_by:['EF']},
    {id:'places',label:'Ruang & kawasan',inspired_by:['Co','En','SL']},
    {id:'roles',label:'Pelaku & peran',inspired_by:['Ro']},
    {id:'equipment',label:'Alat & peralatan',inspired_by:['TE']},
    {id:'project',label:'Proyek & pelaksanaan',inspired_by:['Ac','PM']},
    {id:'properties',label:'Sifat & kinerja',inspired_by:['PC']},
    {id:'general',label:'Umum',inspired_by:[]}
  ];
  const themeParents={
    concrete:'materials',steel:'materials',timber:'materials',masonry:'materials',glass:'materials',
    doors:'elements',windows:'elements',walls:'elements',roofs:'elements',floors:'elements',ceilings:'elements',stairs:'elements',frames:'elements',foundations:'elements',furniture:'elements',finishes:'elements',hardware:'elements',
    water:'services',drainage:'services',electrical:'services',lighting:'services',hvac:'services',fire:'services',
    landscape:'places',site:'places',roads:'places',urban:'places',spaces:'places',transport:'places',
    people:'roles',tools:'equipment',machines:'equipment',drawing:'project',design:'project',contracts:'project',management:'project',finance:'project',
    measurement:'properties',environment:'properties',acoustics:'properties',safety:'properties',geometry:'properties',general:'general'
  };
  const taxonomySources={release:'2026-07',tables:{Ma:'1.1',EF:'1.16',Co:'1.22',En:'1.34',SL:'1.36',Ro:'1.13',Ac:'1.27',PM:'1.30',TE:'1.18',PC:'1.3'},official_mapping:false};
  const extraThemes=[
    {id:'facilities',label:'Bangunan & fasilitas',parent:'places'},
    {id:'other-materials',label:'Bahan lainnya',parent:'materials'},
    {id:'law',label:'Hukum & administrasi',parent:'project'},
    {id:'processes',label:'Proses & pekerjaan',parent:'project'},
    {id:'mechanics',label:'Beban & mekanika',parent:'properties'},
    {id:'qualities',label:'Sifat & keadaan',parent:'properties'},
    {id:'time',label:'Waktu & tahapan',parent:'properties'},
    {id:'communications',label:'Komunikasi & informasi',parent:'services'},
    {id:'thermal',label:'Suhu & kelembapan',parent:'properties'},
    {id:'occupants',label:'Pengguna & masyarakat',parent:'roles'}
  ];
  for(const theme of extraThemes)themeParents[theme.id]=theme.parent;
  const additionalRules=[
    ['roofs',/\b(genteng|kubah|dome|koepel|canopy|kanopi|luifel|shingle|sirap|bubungan|jurai|ijuk|rumbia)\b/],
    ['hardware',/\b(anchor|angker|jangkar|anker|hook|kait|pengait|haak|cantelan|bracket|braket|dovetail|ekor burung|mortise|mortice|tenon|pasak|dowel|paku|nail|nails|rivet|keling|cotter|trali|teralis|trellis|tralie|jeruji)\b/],
    ['frames',/\b(abutment|penopang|shoring|strut|diaphragm|diafragma|travee|trave|cangkang|shell|vault)\b/],
    ['concrete',/\b(additive|aditif|admixture|ferosemen|ferrocement|adukan|spesi|portland)\b/],
    ['steel',/\b(alloy|paduan logam|ferrous|nonferrous|non ferrous|stainless|galvanized|galvanised|galvanisasi|corrosion|korosi|karat)\b/],
    ['drainage',/\b(waste|sampah|refuse|rubbish|garbage|trash|buangan|resapan|seepage|infiltration|infiltrasi|effluent|efluen)\b/],
    ['water',/\b(aeration|aerasi|aerator|aquifer|akifer|artesis|artesian|akuaduk|aqueduct|sumur|well|bendung|dam|weir|embung|waduk|kolam|pond|mata air)\b/],
    ['thermal',/\b(temperature|temperatur|suhu|humidity|kelembaban|kelembapan|thermal|termis|heat|panas|cold|dingin|humid|lembab|lembap|moisture|wet bulb|dry bulb|dbt|wbt)\b/],
    ['drawing',/\b(archief|archive|arsip|document|dokumen|documentation|dokumentasi|record|rekaman|catatan|buku|book|manual|pedoman|guide|panduan|report|laporan|formulir|summary|ringkasan)\b/],
    ['transport',/\b(pier|quay|dermaga|wharf|jetty|dock|berth|kapal|ship|boat|yacht|perahu|ferry|feri|traffic|lalu lintas|lalulintas|train|locomotive|lokomotif|runway|landasan|apron|airstrip|air side|land side)\b/],
    ['urban',/\b(region|wilayah|zona|zone|kawasan|mintakat|regional|pedesaan|rural|slum|kumuh|agglomeration|aglomerasi|ibukota)\b/],
    ['environment',/\b(amdal|ecological|climatic|climatology|weather|cuaca|meteorology|meteorologi|precipitation|presipitasi|radiasi|radiation|albedo|ultraviolet|uv|matahari|wind|angin|rain|hujan|monsoon|monsun|tropical|tropis|arid|season|musim|termite|rayap|fungus|jamur)\b/],
    ['contracts',/\b(bot|boot|bto|dbfo|ppp|konsesi|concession|aggreement)\b/],
    ['people',/\b(cashier|kasir|kassier|teller|juru|petugas|banker|accountant|akuntan|auditor|administrator|administratur|inspector|inspektur|supervisor|penyelia|surveyor|surveior|pengawas|mandor|foreman|clerk|janitor|caretaker|porter|penjaga|carpenter|joiner|mason|bricklayer|welder|plumber|electrician|painter|sculptor|pelukis|pematung|builder|pemborong|drafter|draftsman|draughtsman|penggambar|technician|teknisi|operator|mechanic|mekanik|appraiser|penaksir|valuer|penilai|apprentice|pemagang|trainee|magang|staff|staf|personnel|personil|personel|karyawan|pegawai|labor|labour|laborer|labourer|buruh|artisan|craftsman|pengrajin|employer|employee|employees|employers|tenant|penyewa|landlord|lessor|lessee|stakeholder|supplier|pemasok|vendor|subcontractor|subkontraktor|contractors|consultants|architects|engineers|developer|pengembang|notaris|notary|lawyer|pengacara|advokat|judge|hakim|doctor|dokter|physician|nurse|perawat|midwife|bidan|teacher|guru|lecturer|dosen|profesor|professor|mayor|walikota|bupati|governor|gubernur|director|direktur|manager|manajer|president|presiden|chairman|ketua|secretary|sekretaris|treasurer|bendahara|broker|makelar|agent|agen|agency|biro|department|departemen|dinas|authority|otoritas|council|dewan|institute|institut|asosiasi|association|society|persatuan|union|serikat|firm|firma|yayasan)\b/],
    ['facilities',/\b(jail|prison|penjara|pemasyarakatan|detention|courthouse|pengadilan|barrack|barak|asrama|dormitory|dormitories|hostel|penginapan|residence|kediaman|bungalow|bungalo|villa|vila|mansion|istana|palace|cottage|pondok|cabin|kabin|hut|gubuk|dwelling|hunian|shelter|wisma|bakery|toko|shop|store|retail|pasar|market|supermarket|minimarket|mall|warung|kios|restoran|restaurant|cafe|kafe|cafeteria|kantin|canteen|theater|theatre|teater|cinema|bioskop|auditorium|amphitheatre|amphiteater|amfiteater|museum|galeri|gallery|paviliun|pavilion|gazebo|gudang|warehouse|depot|arsenal|hangar|terminal|stasiun|setasiun|station|motel|clinic|klinik|puskesmas|apotek|pharmacy|morgue|jenazah|mortuary|nursery|ward|bangsal|library|perpustakaan|bibliotheek|laboratory|laboratorium|observatory|observatorium|planetarium|aquarium|akuarium|madrasah|pesantren|college|kampus|campus|university|universitas|kindergarten|masjid|mosque|musala|mushola|musholla|church|gereja|cathedral|katedral|temple|kuil|candi|vihara|kelenteng|klenteng|pagoda|chapel|kapel|abbey|monastery|biara|sinagoge|synagogue|pura|balai|stadium|stadion|gymnasium|gelanggang|arena|fasilitas)\b/],
    ['tools',/\b(spade|sekop|shovel|cangkul|hoe|pickaxe|beliung|kapak|axe|knife|pisau|kape|putty knife|rake|garu|crowbar|linggis|pincer|cutter|pemotong|sander|grinder|gerinda|penggaris|mistar|spirit level|waterpas|clinometer|inclinometer|theodolite|teodolit|compass|kompas|meteran|tape measure|sieve|saringan|ayakan|welding|las|blowtorch|brazing|soldering|katrol|pulley|scoop|sodet|wheelbarrow|gerobak|handcart|scythe|sabit|reamer|rasp|kikir)\b/],
    ['machines',/\b(roller|penggilas|compactor|pemadat|mixer|pengaduk|agitator|dredger|pengeruk|tractor|traktor|truck|truk|dumptruck|compressor|kompresor|forklift|conveyor|konveyor|dynamo|dinamo|winch|kerekan|jackhammer)\b/],
    ['finance',/\b(saham|share|stock|dividend|dividen|amortization|amortisasi|collateral|agunan|mortgage|hipotek|rente|rent|sewa|rental|lease|leasing|angsuran|installment|cicilan|debt|utang|hutang|receivable|piutang|equity|ekuitas|asset|aset|assets|liability|liabilities|aktiva|pasiva|inflation|inflasi|deflation|deflasi|revenue|pendapatan|income|penghasilan|wage|upah|salary|gaji|honorarium|fee|tarif|tax|pajak|ppn|pph|penalty|denda|premium|premi|insurance|asuransi|deposit|setoran|depreciation|depresiasi|penyusutan|investment|investasi|capital|modal|bank|banking|giro|cheque|cek|credit|kredit|debit|invoice|faktur|receipt|kwitansi|kuitansi|turnover|omzet|royalti|royalty|deficit|defisit|surplus|fund|dana|tunjangan)\b/],
    ['law',/\b(legal|hukum|legislation|law|undang|peraturan|regulation|ordinance|perda|keputusan|decree|izin|ijin|permit|licence|license|lisensi|hak|rights|right of|sertifikat|certificate|sertifikasi|certification|approved|approval|persetujuan|pengesahan|arbitration|arbitrasi|arbitrage|adjudication|litigation|litigasi|dispute|sengketa|responsibility|tanggung jawab|notice|pemberitahuan|consent|compliance|kepatuhan|persyaratan|requirement|conditions|administration|administrasi|administratie|admin|tata usaha|birokrasi|bureaucracy|memorandum|memo|surat|circular|edaran|amendment|amandemen|amendement|klausula|wanprestasi|default|force majeure|overmacht|act of god)\b/],
    ['processes',/\b(activity|aktivitas|kegiatan|method|metode|methodology|metodologi|implementation|pelaksanaan|completion|penyelesaian|handover|hand over|serah terima|mobilization|mobilisasi|maintenance|pemeliharaan|perawatan|repair|perbaikan|rehabilitasi|rehabilitation|renovation|renovasi|restoration|restorasi|demolition|pembongkaran|deconstruction|erection|pemasangan|installation|instalasi|setting out|pemancangan|pengerjaan|fabrication|fabrikasi|production|produksi|processing|pengolahan|curing|pengawetan|hardening|pengerasan|cleaning|pembersihan|compaction|pemadatan|cutting|pemotongan|ereksi|hoisting|lifting|pengangkatan|assembly|perakitan|assembling|sampling|pengambilan sampel|testing|pengujian|test|uji|delay|penundaan|postponement|suspension)\b/],
    ['management',/\b(meeting|rapat|conference|konferensi|coordination|koordinasi|programme|program|workflow|supervision|pengawasan|monitoring|pemantauan)\b/],
    ['mechanics',/\b(load|beban|force|gaya aksial|gaya geser|gaya tarik|gaya tekan|stress|strain|tegangan|regangan|tension|tensile|compression|kompresi|shear|torsion|torsi|puntir|moment|momen|bending|lentur|buckling|tekuk|deflection|lendutan|deformasi|deformation|elastic\w*|elastis\w*|plastisitas|plasticity|stiffness|kekakuan|strength|kekuatan|stability|kestabilan|fatigue|kelelahan|creep|rangkak|capacity|kapasitas|bearing|tumpuan|seismic|gempa|earthquake|vibration|getaran|resonance|resonansi|kinetic|kinetik|gravity|gravitasi|density|kepadatan|massa jenis|berat jenis|specific gravity|velocity|kecepatan|acceleration|percepatan|centrifugal|sentrifugal|centripetal|sentripetal)\b/],
    ['other-materials',/\b(rubber|karet|plastic|plastik|polymer|polimer|asbestos|asbes|resin|epoxy|epoksi|polyethylene|polyester|polyurethane|serat|fibre|fiber|fiberglass|fibreglass|composite|komposit|gypsum|gipsum|gips|clay|lempung|adobe|terracotta|terakota|ceramic|keramik|porcelain|porselen|kapur|lime|pasir|sand|aggregate|agregat|gravel|kerikil|silt|lanau|cork|gabus|paper|kertas|straw|jerami|karbon|carbon|calcium|kalsium|silica|silika|silicate|silikat|silicone|silikon|sulfur|belerang|bentonite|bentonit|bauxite|bauksit|chalk|cotton|kapas|wool|wol|textile|tekstil|linen|jute|goni|felt|sisal|rami|rattan|rotan)\b/],
    ['communications',/\b(telephone|telepon|telefoon|telekomunikasi|telecommunication|communication|komunikasi|antenna|antena|antene|aerial|audio visual|audiovisual|television|televisi|radio|intercom|interkom|internet|network|jaringan|signal|sinyal|cctv|sound system|broadband|bandwidth|router|server)\b/],
    ['geometry',/\b(horizontal|vertical|vertikal|horisontal|diagonal|axial|aksial|inclination|inklinasi|slope|kemiringan|concave|convex|cekung|cembung|conical|kerucut|cylindrical|silindris|cylinder|silinder|asymetr\w*|asimetris|square|persegi|bujur sangkar|rectangle|segi empat|quadrant|kuadran|triangular|segitiga|polygon|poligon|hexagon|heksagon|octagon|oktagon|octagonal|ellips\w*|elips|lingkar|bulat|round|datar|rata|tegak|spherical|sphere|spiral|helix|helical|zigzag|titik|dot|node|simpul|diameter|radius|jari jari|alignment|alinemen|alinement|orientation|orientasi|letak|posisi|location|lokasi|position|utara|selatan|timur|barat|north|south|east|west|zenith|zenit|nadir|apex|puncak)\b/],
    ['measurement',/\b(acre|are|hectare|hektare|ha|m2|m3|yard|ons|ounce|ton|tonne|pound|lbs|pon|knot|mile|milimeter|milimetre|centimetre|sentimeter|centimeter|decimeter|desimeter|kilometer|kilometre|derajat|degree|skala|scale|average|rata rata|rerata|median|percent|persen|ratio|rasio|arithmetic|aritmatik|probability|probabilitas|statistik|statistics)\b/],
    ['time',/\b(anno domini|tarikh masehi|sebelum masehi|a d|b c|bc|tahun|year|annum|annual|tahunan|bulan|month|monthly|minggu|week|weekly|harian|daily|hour|jam|minute|menit|second|detik|durasi|duration|period|periode|era|zaman|century|abad|millennium|milenium)\b/],
    ['occupants',/\b(human|manusia|people|inhabitant|penghuni|resident|penduduk|populasi|population|community|komunitas|masyarakat|public|publik|citizen|warga|family|keluarga|household|rumah tangga|male|female|laki laki|perempuan|pria|wanita|child|children|anak|boy|girl|son|daughter|youngster|youth|pemuda|disabilitas|cacat|difabel|disabled|elderly|lansia|geriatric|visitor|pengunjung|guest|tamu|pedestrian|pejalan kaki)\b/]
  ];
  function fillGeneral(entries,byEntry){
    const originalGeneral=new Set(entries.filter(e=>byEntry[e.id].primary==='general').map(e=>e.id));
    function assign(e,candidates){
      const tags=[...new Set(candidates.map(c=>c.theme))].slice(0,3);if(!tags.length)return;
      byEntry[e.id].primary=tags[0];byEntry[e.id].themes=tags;
      byEntry[e.id].tagging={editorial:true,evidence:candidates.filter(c=>tags.includes(c.theme))};
    }
    for(const e of entries){
      if(!originalGeneral.has(e.id)||e.editorial_tags?.themes?.length)continue;
      const head=norm(e.term+' '+e.translations.flatMap(t=>t.terms).join(' ')),context=norm(e.term+' '+e.definition);
      const candidates=additionalRules.filter(([theme,rule])=>rule.test(head)&&!(theme==='geometry'&&/\brata rata\b/.test(head))).map(([theme])=>({theme,basis:'headword-or-translation'}));
      // Example phrases and see-also lists must not dominate the entry's own sense.
      const prose=norm(String(e.definition||'').split(/\b(?:mis\.|misalnya|contoh(?:nya)?|lih\.|lihat|e\.g\.)/i)[0]);
      if(!candidates.length){
        for(const [theme,rule] of additionalRules)if(rule.test(prose)&&!(theme==='geometry'&&/\brata rata\b/.test(prose)))candidates.push({theme,basis:'source-description'});
        if(!candidates.length)for(const t of themes){
          const rule=t[0]==='contracts'?/\b(contract\w*|kontrak|tender|bid|bids|bidder\w*|bidding|lelang|procurement|pengadaan|agreement|perjanjian|clause|klausul|addendum|adendum|bond|jaminan)\b/:t[2];
          if(rule.test(prose)&&!(t[4]&&t[4].test(context))&&!(t[0]==='stairs'&&/\b(rumah tangga|household|sanitary|sanitasi)\b/.test(prose)))candidates.push({theme:t[0],basis:'source-description'});
        }
      }
      const abbreviation=/^[A-Z\d][A-Z\d.\s/&-]{1,11}$/.test(e.term);
      if(e.word_type==='aj'&&!abbreviation&&!candidates.some(c=>themeParents[c.theme]==='properties'))candidates.unshift({theme:'qualities',basis:'word-type:aj'});
      assign(e,candidates);
    }
    // Only original translations and explicit source references pass tags on.
    // Suggested graph neighbours never serve as classification evidence.
    for(let pass=0;pass<3;pass++){
      const pending=[];
      for(const e of entries){
        if(byEntry[e.id].primary!=='general'||e.editorial_tags?.themes?.length)continue;
        const ids=[...new Set([...e.equivalent_ids,...e.related.flatMap(r=>r.entry_ids||[])])];
        const candidates=ids.flatMap(id=>(byEntry[id]?.themes||[]).map(theme=>({theme,basis:'source-reference',entry_id:id})));
        if(candidates.length)pending.push([e,candidates]);
      }
      if(!pending.length)break;for(const [e,candidates] of pending)assign(e,candidates);
    }
    return {previous_general:originalGeneral.size,remaining_general:Object.values(byEntry).filter(e=>e.primary==='general').length};
  }
  function words(text){return norm(text).split(' ').filter(w=>w.length>=3&&!/^\d+$/.test(w)&&!stop.has(w));}
  function build(entries){
    entries=entries.map(entry=>typeof entry.editorial_meaning==='string'?{...entry,definition:entry.editorial_meaning}:entry);
    const lookup=new Map(entries.map((e,i)=>[e.id,i])),nameLookup=new Map(),original=new Set(),related=entries.map(()=>new Map());
    entries.forEach((e,i)=>{const k=norm(e.term);if(!nameLookup.has(k))nameLookup.set(k,[]);nameLookup.get(k).push(i);for(const id of [...e.equivalent_ids,...e.related.flatMap(r=>r.entry_ids||[])])original.add([e.id,id].sort().join('|'));});
    const documents=entries.map(e=>{const aliases=e.translations.flatMap(t=>t.terms).join(' '),head=norm(e.term+' '+aliases),counts=new Map();for(const [text,weight] of [[e.term,3],[aliases,2],[e.definition,1]])for(const word of words(text))counts.set(word,(counts.get(word)||0)+weight);const matched=themes.filter(t=>t[2].test(head)&&!(t[4]&&t[4].test(norm(e.term+' '+aliases+' '+e.definition)))).map(t=>t[0]);return {counts,themes:matched,head};});
    const byEntry={};
    entries.forEach((entry,i)=>{
      const reviewed=entry.editorial_tags?.themes;
      if(reviewed?.length)documents[i].themes=reviewed.filter(id=>id==='general'||Object.hasOwn(themeParents,id));
      byEntry[entry.id]={primary:documents[i].themes[0]||'general',themes:documents[i].themes,related:[]};
      if(reviewed?.length)byEntry[entry.id].tagging={editorial:true,reviewed_on:entry.editorial_tags.reviewed_on,evidence:[{basis:'reviewed-source-sense',reason:entry.editorial_tags.reason}]};
    });
    const df=new Map();documents.forEach(d=>d.counts.forEach((_,w)=>df.set(w,(df.get(w)||0)+1)));
    const postings=new Map();
    documents.forEach((d,i)=>{const vector=[...d.counts].filter(([w])=>df.get(w)>1&&df.get(w)<=200).map(([w,count])=>[w,Math.log(1+entries.length/df.get(w))*Math.sqrt(count)]).sort((a,b)=>b[1]-a[1]).slice(0,14),length=Math.hypot(...vector.map(x=>x[1]))||1;d.vector=vector.map(([w,n])=>[w,n/length]);for(const [w,n] of d.vector){if(!postings.has(w))postings.set(w,[]);postings.get(w).push([i,n]);}});
    function add(a,b,score,basis,theme){if(a===b||original.has([entries[a].id,entries[b].id].sort().join('|')))return;for(const [x,y] of [[a,b],[b,a]]){const old=related[x].get(y);if(!old||old.score<score)related[x].set(y,{index:y,score,basis,theme});}}
    // Exact, bilingual element families attach members to actual existing terms.
    // These links are editorial additions, never inserted into the source text.
    for(const theme of themes){const members=documents.flatMap((d,i)=>d.themes.includes(theme[0])?[i]:[]),anchors=theme[3].flatMap(name=>nameLookup.get(norm(name))||[]).filter(i=>documents[i].themes.includes(theme[0])).slice(0,3);for(const i of members)for(const anchor of anchors)add(i,anchor,.78,'theme',theme[0]);}
    const preferredDoors=['Door Frame','Doorplate','Door-stop','Door Schedule','Door Handle','Door Jamb','Door Closer','Rangka Pintu'];
    const doorAnchors=['Door','Pintu','Deur'].flatMap(n=>nameLookup.get(norm(n))||[]);for(const name of preferredDoors)for(const i of nameLookup.get(norm(name))||[])for(const anchor of doorAnchors)add(i,anchor,.97,'theme','doors');
    for(let i=0;i<documents.length;i++){
      const scores=new Map(),shared=new Map();for(const [word,w] of documents[i].vector)for(const [j,v] of postings.get(word)||[]){if(i===j)continue;scores.set(j,(scores.get(j)||0)+w*v);shared.set(j,(shared.get(j)||0)+1);}
      const best=[...scores].filter(([j,score])=>score>=.42&&shared.get(j)>=2&&(!documents[i].themes.length||!documents[j].themes.length||documents[i].themes.some(t=>documents[j].themes.includes(t))||score>=.75)).sort((a,b)=>b[1]-a[1]).slice(0,6);
      for(const [j,score] of best)add(i,j,Math.min(.94,Number(score.toFixed(3))),'text');
    }
    const edgeMap=new Map();
    entries.forEach((e,i)=>{const sorted=[...related[i].values()].sort((a,b)=>b.score-a.score||entries[a.index].term.localeCompare(entries[b.index].term,'id')).slice(0,10);byEntry[e.id]={...byEntry[e.id],related:sorted.map(r=>({id:entries[r.index].id,score:r.score,basis:r.basis,...(r.theme?{theme:r.theme}:{})}))};for(const r of sorted){const target=entries[r.index].id,key=[e.id,target].sort().join('|');if(!edgeMap.has(key)||edgeMap.get(key).score<r.score)edgeMap.set(key,{source:e.id,target,score:r.score,basis:r.basis,...(r.theme?{theme:r.theme}:{})});}});
    // Broad fallback tags aid folder navigation; they must not invent semantic
    // edges between every term sharing a general profession/property category.
    const grouping=fillGeneral(entries,byEntry);
    const Content=typeof module!=='undefined'&&module.exports?require('./entry-content.js'):root.KamusContent,domainThemes=new Map();let domainEntries=0;
    for(const e of entries){
      const meaning=Content?.meaning(e),subjects=meaning?.provider==='kbbi_iii'?meaning.layout?.tags:[];
      if(!subjects?.length)continue;domainEntries++;
      const item=byEntry[e.id];item.kbbi_tags=subjects.map(d=>({...d,source_entry_ids:meaning.layout.items.filter(i=>i.domains.some(t=>t.id===d.id)||i.senses.some(s=>s.qualifiers.includes(d.label))).map(i=>i.sourceEntryId)}));
      for(const d of subjects){
        domainThemes.set(d.id,{id:d.id,label:d.label,parent:d.parent,kind:d.kind,source:'KBBI III'});
        if(!item.themes.includes(d.id))item.themes.push(d.id);
        if(item.primary==='general')item.primary=d.id;
      }
    }
    grouping.remaining_general=Object.values(byEntry).filter(e=>e.primary==='general').length;
    for(const item of Object.values(byEntry))item.categories=[...new Set((item.themes.length?item.themes:['general']).map(id=>domainThemes.get(id)?.parent||themeParents[id]||'general'))];
    return {version:3,built_at:new Date().toISOString(),metadata:{method:'Editorial bilingual element families plus conservative weighted overlap of current headwords, translations, and definitions. Broad navigation parents are inspired by supplied Uniclass tables. Additional grouping uses headwords, translations, source descriptions, adjective labels, and explicit source references. No new definitions, external terms, or official Uniclass mappings are introduced.',entry_count:entries.length,edge_count:edgeMap.size,editorial:true,review_status:'Automatically suggested relationships and broad tags; subject to maintainer review.',taxonomy_sources:taxonomySources,grouping,kbbi_iii_tags:{entry_count:domainEntries,domain_count:[...domainThemes.values()].filter(d=>d.kind==='domain').length,tag_count:domainThemes.size,source:'Explicit subject and usage labels in displayed KBBI III excerpts; grouped under Umum with no label propagation to other entries.'}},categories,themes:[...themes.map(t=>({id:t[0],label:t[1],parent:themeParents[t[0]]})),...extraThemes,...domainThemes.values(),{id:'general',label:'Umum',parent:'general'}],byEntry,edges:[...edgeMap.values()]};
  }
  const api={build,norm};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusAssociations=api;
})(typeof window==='undefined'?globalThis:window);
