/**
 * VetPassport – Merkezi LocalStorage Veri Motoru
 * ================================================
 * Tüm sayfaların ortak kullandığı tek kaynak.
 * Veritabanı/backend olmadan tam bir CRUD simülasyonu yapar.
 *
 * İçerik:
 *  1. Sabitler & yardımcı fonksiyonlar
 *  2. Başlangıç (seed) verisi
 *  3. LocalStorage CRUD katmanı
 *  4. Rol yönetimi (OWNER / VET)
 *  5. Pasaport no & aşı takvimi üreteci
 *  6. Randevu – dolu saat kilitleme
 *  7. Veteriner muayene / aşı tamamlama & reçete
 *  8. Toast bildirimleri
 *  9. Sayfa yönlendirme yardımcıları
 * 10. Otomatik init
 */

'use strict';

/* ── 1. Sabitler & Yardımcılar ─────────────────────────── */

const VP = (() => {

  /* ----- Depo anahtarları ----- */
  const KEYS = {
    PETS:         'vp_pets',
    VACCINES:     'vp_vaccines',
    EXAMS:        'vp_exams',
    PRESCRIPTIONS:'vp_prescriptions',
    WEIGHTS:      'vp_weights',
    APPOINTMENTS: 'vp_appointments',
    CLINICS:      'vp_clinics',
    ROLE:         'vp_active_role',
    ACTIVE_PET:   'vp_active_pet_id',
    ACTIVE_USER:  'vp_active_user',
  };

  /* ----- Tarih araçları ----- */
  const today = () => new Date().toISOString().split('T')[0];

  const addDays = (dateStr, n) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  const diffDays = (dateStr) => {
    const diff = new Date(dateStr) - new Date(today());
    return Math.round(diff / 86_400_000);
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });
  };

  /* ----- UUID benzeri id üreteci ----- */
  const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

  /* ----- LocalStorage CRUD ----- */
  const ls = {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(key)) ?? []; }
      catch { return []; }
    },
    getObj: (key) => {
      try { return JSON.parse(localStorage.getItem(key)) ?? {}; }
      catch { return {}; }
    },
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    getString: (key, def = '') => localStorage.getItem(key) ?? def,
    setString: (key, val) => localStorage.setItem(key, val),
  };

  /* ── 2. Seed Verisi ─────────────────────────────────── */

  const SEED_PETS = [
    {
      id: 'PET001',
      passportNo: 'VPP-2024-PET001',
      name: 'Pamuq',
      species: 'Kedi',
      breed: 'Van Kedisi',
      gender: 'Dişi',
      birthDate: '2021-03-15',
      color: 'Beyaz',
      microchipNo: 'MC123456789',
      ownerId: 'OWN001',
      ownerName: 'Ahmet Yılmaz',
      ownerPhone: '0532 111 2233',
      photoEmoji: '🐱',
      createdAt: '2024-01-10',
    },
    {
      id: 'PET002',
      passportNo: 'VPP-2024-PET002',
      name: 'Karabaş',
      species: 'Köpek',
      breed: 'Labrador Retriever',
      gender: 'Erkek',
      birthDate: '2020-07-22',
      color: 'Siyah',
      microchipNo: 'MC987654321',
      ownerId: 'OWN001',
      ownerName: 'Ahmet Yılmaz',
      ownerPhone: '0532 111 2233',
      photoEmoji: '🐶',
      createdAt: '2024-02-05',
    },
  ];

  const SEED_VACCINES = [
    /* Pamuq – GECİKMİŞ */
    {
      id: 'VAC001', petId: 'PET001', name: 'Kuduz Aşısı',
      scheduledDate: addDays(today(), -14),
      administeredDate: null, status: 'overdue',
      vetName: null, batchNo: null, notes: '',
    },
    /* Pamuq – YAKLAŞAN */
    {
      id: 'VAC002', petId: 'PET001', name: 'İç Parazit Tedavisi',
      scheduledDate: addDays(today(), 7),
      administeredDate: null, status: 'upcoming',
      vetName: null, batchNo: null, notes: '',
    },
    /* Pamuq – TAMAMLANMIŞ */
    {
      id: 'VAC003', petId: 'PET001', name: 'FeLV (Kedi Lösemi)',
      scheduledDate: addDays(today(), -90),
      administeredDate: addDays(today(), -90),
      status: 'done',
      vetName: 'Dr. Selin Demir', batchNo: 'B2024-FLV', notes: 'Tolerans iyi.',
    },
    /* Karabaş – GECİKMİŞ */
    {
      id: 'VAC004', petId: 'PET002', name: 'Karma Aşı (DHPPi+L)',
      scheduledDate: addDays(today(), -5),
      administeredDate: null, status: 'overdue',
      vetName: null, batchNo: null, notes: '',
    },
    /* Karabaş – YAKLAŞAN */
    {
      id: 'VAC005', petId: 'PET002', name: 'Kuduz Aşısı (Yıllık)',
      scheduledDate: addDays(today(), 21),
      administeredDate: null, status: 'upcoming',
      vetName: null, batchNo: null, notes: '',
    },
    /* Karabaş – TAMAMLANMIŞ */
    {
      id: 'VAC006', petId: 'PET002', name: 'Bordetella (Kulüp Öksürüğü)',
      scheduledDate: addDays(today(), -180),
      administeredDate: addDays(today(), -180),
      status: 'done',
      vetName: 'Dr. Murat Çelik', batchNo: 'B2024-BRD', notes: 'Buster ile aynı gün.',
    },
  ];

  const SEED_EXAMS = [
    {
      id: 'EX001', petId: 'PET001',
      date: addDays(today(), -90),
      vetName: 'Dr. Selin Demir',
      complaint: 'İştahsızlık, uyuşukluk',
      diagnosis: 'Hafif anemi – demir takviyesi önerildi',
      treatment: 'Ferrodex 0.5 ml IM x3 gün',
      notes: 'Kontrol randevusu 2 hafta sonra.',
      weight: 4.2,
    },
    {
      id: 'EX002', petId: 'PET001',
      date: addDays(today(), -30),
      vetName: 'Dr. Selin Demir',
      complaint: 'Kulak kaşıma',
      diagnosis: 'Otitis externa',
      treatment: 'Surolan kulak damlası 7 gün',
      notes: 'Kulak temizliği yapıldı.',
      weight: 4.4,
    },
    {
      id: 'EX003', petId: 'PET002',
      date: addDays(today(), -60),
      vetName: 'Dr. Murat Çelik',
      complaint: 'Yıllık kontrol',
      diagnosis: 'Genel durum iyi',
      treatment: 'Dış parazit spreyi',
      notes: 'Diş taşı var – 6 ay içinde diş temizliği önerildi.',
      weight: 28.5,
    },
  ];

  const SEED_PRESCRIPTIONS = [
    {
      id: 'PRE001', petId: 'PET001', examId: 'EX001',
      date: addDays(today(), -90),
      vetName: 'Dr. Selin Demir',
      medicines: [
        { name: 'Ferrodex', dose: '0.5 ml', route: 'IM', frequency: 'Günde 1', duration: '3 gün' },
        { name: 'Vit B12 Tableti', dose: '1 tablet', route: 'PO', frequency: 'Günde 1', duration: '10 gün' },
      ],
      notes: 'Yüksek proteinli mama önerildi.',
    },
    {
      id: 'PRE002', petId: 'PET001', examId: 'EX002',
      date: addDays(today(), -30),
      vetName: 'Dr. Selin Demir',
      medicines: [
        { name: 'Surolan Kulak Damlası', dose: '5 damla', route: 'Kulağa', frequency: 'Günde 2', duration: '7 gün' },
      ],
      notes: 'Kulak ıslatılmamalı.',
    },
  ];

  const SEED_WEIGHTS = [
    { id: 'W001', petId: 'PET001', date: addDays(today(), -180), weight: 3.8 },
    { id: 'W002', petId: 'PET001', date: addDays(today(), -90),  weight: 4.2 },
    { id: 'W003', petId: 'PET001', date: addDays(today(), -30),  weight: 4.4 },
    { id: 'W004', petId: 'PET001', date: today(),                weight: 4.5 },
    { id: 'W005', petId: 'PET002', date: addDays(today(), -180), weight: 25.1 },
    { id: 'W006', petId: 'PET002', date: addDays(today(), -90),  weight: 27.0 },
    { id: 'W007', petId: 'PET002', date: addDays(today(), -60),  weight: 28.5 },
    { id: 'W008', petId: 'PET002', date: today(),                 weight: 29.2 },
  ];

  const SEED_APPOINTMENTS = [
    {
      id: 'APT001', petId: 'PET001',
      date: addDays(today(), 7),
      time: '10:00',
      vetName: 'Dr. Selin Demir',
      clinicName: 'Pati Veteriner Kliniği',
      reason: 'İç Parazit Tedavisi',
      status: 'confirmed',
    },
    {
      id: 'APT002', petId: 'PET002',
      date: addDays(today(), 21),
      time: '14:30',
      vetName: 'Dr. Murat Çelik',
      clinicName: 'Dost Hayvan Hastanesi',
      reason: 'Yıllık Kuduz Aşısı',
      status: 'confirmed',
    },
    {
      id: 'APT003', petId: 'PET001',
      date: addDays(today(), -30),
      time: '11:00',
      vetName: 'Dr. Selin Demir',
      clinicName: 'Pati Veteriner Kliniği',
      reason: 'Kulak Muayenesi',
      status: 'completed',
    },
  ];

  const SEED_CLINICS = [
    {
      id: 'CLN001',
      name: 'Pati Veteriner Kliniği',
      address: 'Bağcılar Mah. Çiçek Sk. No:12, İstanbul',
      phone: '0212 555 1234',
      onDuty: true,
      workingHours: '08:00 – 22:00',
      vets: ['Dr. Selin Demir', 'Dr. Ayşe Kaya'],
      availableSlots: {
        /* "DR İSMİ|TARİH": ["HH:MM", ...] dizisi – dolu saatler */
        [`Dr. Selin Demir|${addDays(today(), 7)}`]: ['10:00', '11:30'],
      },
    },
    {
      id: 'CLN002',
      name: 'Dost Hayvan Hastanesi',
      address: 'Kadıköy, Moda Cd. No:45, İstanbul',
      phone: '0216 444 9876',
      onDuty: true,
      workingHours: '00:00 – 24:00 (Nöbetçi)',
      vets: ['Dr. Murat Çelik', 'Dr. Hasan Öz'],
      availableSlots: {
        [`Dr. Murat Çelik|${addDays(today(), 21)}`]: ['14:30', '16:00'],
      },
    },
    {
      id: 'CLN003',
      name: 'Minik Patiler Kliniği',
      address: 'Üsküdar, Paşa Sk. No:8, İstanbul',
      phone: '0216 333 7788',
      onDuty: false,
      workingHours: '09:00 – 18:00',
      vets: ['Dr. Fatma Arslan'],
      availableSlots: {},
    },
  ];

  /* ── 3. CRUD Katmanı ──────────────────────────────────── */

  const pets = {
    all: () => ls.get(KEYS.PETS),
    get: (id) => ls.get(KEYS.PETS).find(p => p.id === id) ?? null,
    save: (arr) => ls.set(KEYS.PETS, arr),
    add: (pet) => { const a = pets.all(); a.push(pet); pets.save(a); return pet; },
    update: (id, patch) => {
      const a = pets.all().map(p => p.id === id ? { ...p, ...patch } : p);
      pets.save(a); return a.find(p => p.id === id);
    },
    remove: (id) => { pets.save(pets.all().filter(p => p.id !== id)); },
  };

  const vaccines = {
    all: () => ls.get(KEYS.VACCINES),
    forPet: (petId) => ls.get(KEYS.VACCINES).filter(v => v.petId === petId),
    save: (arr) => ls.set(KEYS.VACCINES, arr),
    add: (v) => { const a = vaccines.all(); a.push(v); vaccines.save(a); return v; },
    update: (id, patch) => {
      const a = vaccines.all().map(v => v.id === id ? { ...v, ...patch } : v);
      vaccines.save(a); return a.find(v => v.id === id);
    },
  };

  const exams = {
    all: () => ls.get(KEYS.EXAMS),
    forPet: (petId) => ls.get(KEYS.EXAMS).filter(e => e.petId === petId)
                         .sort((a,b) => b.date.localeCompare(a.date)),
    save: (arr) => ls.set(KEYS.EXAMS, arr),
    add: (e) => { const a = exams.all(); a.push(e); exams.save(a); return e; },
  };

  const prescriptions = {
    all: () => ls.get(KEYS.PRESCRIPTIONS),
    forPet: (petId) => ls.get(KEYS.PRESCRIPTIONS).filter(p => p.petId === petId),
    save: (arr) => ls.set(KEYS.PRESCRIPTIONS, arr),
    add: (p) => { const a = prescriptions.all(); a.push(p); prescriptions.save(a); return p; },
  };

  const weights = {
    all: () => ls.get(KEYS.WEIGHTS),
    forPet: (petId) => ls.get(KEYS.WEIGHTS).filter(w => w.petId === petId)
                          .sort((a,b) => a.date.localeCompare(b.date)),
    save: (arr) => ls.set(KEYS.WEIGHTS, arr),
    add: (w) => { const a = weights.all(); a.push(w); weights.save(a); return w; },
  };

  const appointments = {
    all: () => ls.get(KEYS.APPOINTMENTS),
    forPet: (petId) => ls.get(KEYS.APPOINTMENTS).filter(a => a.petId === petId),
    upcoming: () => ls.get(KEYS.APPOINTMENTS).filter(a =>
        a.status !== 'completed' && a.date >= today())
      .sort((a,b) => a.date.localeCompare(b.date)),
    save: (arr) => ls.set(KEYS.APPOINTMENTS, arr),
    add: (a) => { const arr = appointments.all(); arr.push(a); appointments.save(arr); return a; },
    update: (id, patch) => {
      const arr = appointments.all().map(a => a.id === id ? { ...a, ...patch } : a);
      appointments.save(arr); return arr.find(a => a.id === id);
    },
  };

  const clinics = {
    all: () => ls.get(KEYS.CLINICS),
    onDuty: () => ls.get(KEYS.CLINICS).filter(c => c.onDuty),
    get: (id) => ls.get(KEYS.CLINICS).find(c => c.id === id) ?? null,
    save: (arr) => ls.set(KEYS.CLINICS, arr),
  };

  /* ── 4. Rol Yönetimi ─────────────────────────────────── */

  const role = {
    /**
     * Aktif rolü döndürür: 'OWNER' | 'VET'
     * Varsayılan: OWNER
     */
    get: () => ls.getString(KEYS.ROLE, 'OWNER'),

    /** Rolü değiştir ve sayfayı dashboard'a yönlendir */
    switchTo: (newRole) => {
      if (!['OWNER', 'VET'].includes(newRole)) return;
      ls.setString(KEYS.ROLE, newRole);
      toast.show(`Rol değiştirildi: ${newRole === 'OWNER' ? '🏠 Sahip' : '🩺 Veteriner'}`, 'success');
      /* 500ms sonra dashboard'a git */
      setTimeout(() => { window.location.href = '/dashboard'; }, 500);
    },

    isVet:   () => role.get() === 'VET',
    isOwner: () => role.get() === 'OWNER',
  };

  /* ── 5. Pasaport No & Aşı Takvimi Üreteci ────────────── */

  /**
   * Standart aşı takvimleri (tür bazlı).
   * Her eleman: { name, offsetDays } – kayıt tarihinden gün farkı.
   */
  const VACCINE_SCHEDULES = {
    'Kedi': [
      { name: 'Tricat (İlk Doz)',           offsetDays: 7   },
      { name: 'Tricat (Rapel)',              offsetDays: 28  },
      { name: 'FeLV (Kedi Lösemi)',          offsetDays: 56  },
      { name: 'Kuduz Aşısı',                offsetDays: 84  },
      { name: 'Yıllık Rapel',               offsetDays: 365 },
    ],
    'Köpek': [
      { name: 'Karma Aşı DHPPi (İlk Doz)',  offsetDays: 7   },
      { name: 'Karma Aşı DHPPi (Rapel)',    offsetDays: 28  },
      { name: 'Bordetella',                 offsetDays: 42  },
      { name: 'Kuduz Aşısı',               offsetDays: 84  },
      { name: 'Yıllık Rapel',              offsetDays: 365 },
    ],
    'Kuş': [
      { name: 'Newcastle Hastalığı Aşısı',  offsetDays: 14  },
      { name: 'Poliomyelit Aşısı',          offsetDays: 42  },
    ],
    'Tavşan': [
      { name: 'VHD Aşısı',                  offsetDays: 30  },
      { name: 'Miyomatozis Aşısı',          offsetDays: 60  },
    ],
  };

  /**
   * Yeni hayvan eklendiğinde:
   *  1. Pasaport no üretir
   *  2. Türe özel başlangıç aşı takvimini oluşturur
   *  3. Hayvanı ve aşıları kaydeder
   *  4. Toast bildirim gönderir
   * @param {Object} petData - form verisi (name, species, breed, gender, birthDate, ownerId, ownerName, ownerPhone, color, microchipNo, photoEmoji)
   * @returns {Object} oluşturulan pet nesnesi
   */
  const registerPet = (petData) => {
    const year    = new Date().getFullYear();
    const shortId = uid();
    const id          = `PET-${shortId}`;
    const passportNo  = `VPP-${year}-${shortId}`;

    const newPet = {
      id,
      passportNo,
      createdAt: today(),
      ...petData,
    };

    pets.add(newPet);

    /* Türe özel aşı takvimi oluştur */
    const schedule = VACCINE_SCHEDULES[petData.species] ?? [];
    schedule.forEach((vac, idx) => {
      vaccines.add({
        id: `VAC-${uid()}`,
        petId: id,
        name: vac.name,
        scheduledDate: addDays(today(), vac.offsetDays),
        administeredDate: null,
        status: 'upcoming',
        vetName: null,
        batchNo: null,
        notes: `Otomatik oluşturuldu – ${petData.species} standart takvimi`,
        order: idx + 1,
      });
    });

    toast.show(`✅ ${petData.name} pasaportu oluşturuldu! No: ${passportNo}`, 'success');
    return newPet;
  };

  /* ── 6. Randevu – Dolu Saat Kilitleme ───────────────── */

  /**
   * Belirtilen veteriner ve tarihteki dolu saatleri döndürür.
   * @param {string} clinicId
   * @param {string} vetName
   * @param {string} date  – "YYYY-MM-DD"
   * @returns {string[]} dolu saatler ["10:00", "14:30", ...]
   */
  const getBookedSlots = (clinicId, vetName, date) => {
    const clinic = clinics.get(clinicId);
    if (!clinic) return [];
    const key = `${vetName}|${date}`;
    return clinic.availableSlots?.[key] ?? [];
  };

  /**
   * Tüm saat dilimlerini (08:00–18:00, 30dk aralıklı) üretir;
   * dolu olanları "disabled" olarak işaretler.
   * @returns {{ time: string, available: boolean }[]}
   */
  const buildSlotList = (clinicId, vetName, date) => {
    const booked = getBookedSlots(clinicId, vetName, date);
    const slots = [];
    for (let h = 8; h < 19; h++) {
      for (let m of [0, 30]) {
        const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        slots.push({ time: t, available: !booked.includes(t) });
      }
    }
    return slots;
  };

  /**
   * Yeni randevu ekler ve ilgili saat dilimini kilitler.
   * @param {Object} aptData – { petId, date, time, vetName, clinicId, clinicName, reason }
   * @returns {Object} oluşturulan randevu
   */
  const bookAppointment = (aptData) => {
    /* Çakışma kontrolü */
    const booked = getBookedSlots(aptData.clinicId, aptData.vetName, aptData.date);
    if (booked.includes(aptData.time)) {
      toast.show(`⚠️ ${aptData.time} saati dolu! Lütfen başka saat seçin.`, 'error');
      return null;
    }

    /* Randevuyu kaydet */
    const apt = appointments.add({
      id: `APT-${uid()}`,
      status: 'confirmed',
      createdAt: today(),
      ...aptData,
    });

    /* Kliniğin dolu saatini güncelle */
    const allClinics = clinics.all();
    const cIdx = allClinics.findIndex(c => c.id === aptData.clinicId);
    if (cIdx >= 0) {
      const key = `${aptData.vetName}|${aptData.date}`;
      if (!allClinics[cIdx].availableSlots) allClinics[cIdx].availableSlots = {};
      if (!allClinics[cIdx].availableSlots[key]) allClinics[cIdx].availableSlots[key] = [];
      allClinics[cIdx].availableSlots[key].push(aptData.time);
      clinics.save(allClinics);
    }

    toast.show(`📅 Randevu alındı: ${aptData.date} ${aptData.time} – ${aptData.vetName}`, 'success');
    return apt;
  };

  /* ── 7. Veteriner: Muayene Tamamlama & Reçete ────────── */

  /**
   * Bir aşıyı tamamlandı olarak işaretler ve bir sonraki aşı tarihini otomatik hesaplar.
   * @param {string} vaccineId
   * @param {Object} data – { vetName, batchNo, notes, administered: "YYYY-MM-DD" }
   * @param {number} [nextIntervalDays=365] – bir sonraki doz için gün farkı (varsayılan 1 yıl)
   * @returns {Object} güncellenmiş aşı
   */
  const completeVaccine = (vaccineId, data, nextIntervalDays = 365) => {
    const v = vaccines.update(vaccineId, {
      status: 'done',
      administeredDate: data.administered || today(),
      vetName: data.vetName,
      batchNo: data.batchNo || '',
      notes: data.notes || '',
    });

    if (!v) return null;

    /* Bir sonraki rapeli oluştur */
    const nextDate = addDays(v.administeredDate, nextIntervalDays);
    vaccines.add({
      id: `VAC-${uid()}`,
      petId: v.petId,
      name: `${v.name} (Yıllık Rapel)`,
      scheduledDate: nextDate,
      administeredDate: null,
      status: 'upcoming',
      vetName: null,
      batchNo: null,
      notes: `Otomatik rapel – ${v.name} tamamlandı`,
    });

    toast.show(`💉 Aşı tamamlandı. Sonraki rapel: ${fmtDate(nextDate)}`, 'success');
    return v;
  };

  /**
   * Muayene kaydı oluşturur, reçete ekler, kilo kaydeder.
   * @param {Object} examData – { petId, vetName, complaint, diagnosis, treatment, notes, weight }
   * @param {Array}  medicineList – [{ name, dose, route, frequency, duration }, ...]
   * @returns {{ exam: Object, prescription: Object }}
   */
  const completeExam = (examData, medicineList = []) => {
    /* Muayene */
    const exam = exams.add({
      id: `EX-${uid()}`,
      date: today(),
      ...examData,
    });

    /* Kilo kaydı */
    if (examData.weight) {
      weights.add({ id: `W-${uid()}`, petId: examData.petId, date: today(), weight: parseFloat(examData.weight) });
    }

    /* Reçete */
    let prescription = null;
    if (medicineList.length > 0) {
      prescription = prescriptions.add({
        id: `PRE-${uid()}`,
        petId: examData.petId,
        examId: exam.id,
        date: today(),
        vetName: examData.vetName,
        medicines: medicineList,
        notes: examData.prescriptionNotes || '',
      });
    }

    /* İlgili randevuyu tamamlandı yap */
    const relatedApt = appointments.all().find(
      a => a.petId === examData.petId && a.status === 'confirmed' && a.date === today()
    );
    if (relatedApt) {
      appointments.update(relatedApt.id, { status: 'completed' });
    }

    toast.show(`🩺 Muayene kaydedildi${prescription ? ' + reçete eklendi' : ''}.`, 'success');
    return { exam, prescription };
  };

  /* ── 8. Toast Bildirimleri ──────────────────────────── */

  const toast = {
    show: (message, type = 'info', duration = 3500) => {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => { el.remove(); }, duration);
    },
  };

  /* ── 9. Aktif Hayvan Seçimi ──────────────────────────── */

  const activePet = {
    get: () => {
      const id = ls.getString(KEYS.ACTIVE_PET, '');
      return id ? pets.get(id) : (pets.all()[0] ?? null);
    },
    set: (petId) => ls.setString(KEYS.ACTIVE_PET, petId),
  };

  /* ── 10. Init – Seed Verisi Yükle ───────────────────── */

  const init = () => {
    /* Daha önce yüklendiyse tekrar yükleme */
    if (ls.getString('vp_seeded') === '1') return;

    ls.set(KEYS.PETS,          SEED_PETS);
    ls.set(KEYS.VACCINES,      SEED_VACCINES);
    ls.set(KEYS.EXAMS,         SEED_EXAMS);
    ls.set(KEYS.PRESCRIPTIONS, SEED_PRESCRIPTIONS);
    ls.set(KEYS.WEIGHTS,       SEED_WEIGHTS);
    ls.set(KEYS.APPOINTMENTS,  SEED_APPOINTMENTS);
    ls.set(KEYS.CLINICS,       SEED_CLINICS);
    ls.setString('vp_seeded',  '1');

    console.info('[VetPassport] ✅ Başlangıç verileri yüklendi.');
  };

  /**
   * Vize sunumu için tüm localStorage verilerini temizleyip
   * başlangıç demo durumuna döndürür.
   */
  const resetData = () => {
    if (confirm('Tüm eklenen veriler sıfırlanıp başlangıç demo verilerine dönülecektir. Onaylıyor musunuz?')) {
      localStorage.clear();
      init();
      if (toast && toast.show) {
        toast.show('🔄 Veriler başlangıç durumuna sıfırlandı.', 'info');
      }
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  // İlk yüklemede seed verisini hazırla
  init();

  /* ── Dışa Aktar ─────────────────────────────────────── */
  return {
    init,
    resetData,
    /* Veri depoları */
    pets,
    vaccines,
    exams,
    prescriptions,
    weights,
    appointments,
    clinics,
    /* İş mantığı */
    role,
    registerPet,
    bookAppointment,
    getBookedSlots,
    buildSlotList,
    completeVaccine,
    completeExam,
    activePet,
    /* Yardımcılar */
    toast,
    today,
    addDays,
    diffDays,
    fmtDate,
    uid,
    KEYS,
  };
})();

/* Global yardımcı fonksiyonlar (Tüm sayfalarda ortak kullanım) */
window.resetAllDemoData = () => {
  VP.resetData?.();
};

window.switchCurrentRole = (targetRole) => {
  VP.role?.switchTo(targetRole);
};

/* Global init – DOM hazır olduğunda çalış */
document.addEventListener('DOMContentLoaded', () => {
  VP.init?.(); /* init iç fonksiyon, doğrudan çağırılamaz; init() burada çalışır */

  /* Navbar'daki aktif bağlantıyı işaretle */
  document.querySelectorAll('.navbar-nav a').forEach(a => {
    if (a.getAttribute('href') === window.location.pathname) {
      a.classList.add('active');
    }
  });

  /* Rol badge'lerini güncelle */
  document.querySelectorAll('[data-role-badge]').forEach(el => {
    const r = VP.role.get();
    el.textContent = r === 'VET' ? '🩺 Veteriner' : '🏠 Sahip';
    el.className = `role-badge ${r === 'VET' ? 'vet' : 'owner'}`;
  });
});
