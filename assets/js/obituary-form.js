import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { config } from "./config.js";
import { searchFuneralHomes } from "./funeral-api.js?v=2";
import { attachDatePickersById } from "./calendar-picker.js?v=1";

// Firebase 초기화
const app = initializeApp(config.firebase);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const form = document.getElementById('obituaryForm');

// Photo Upload Elements
const photoUploadInput = document.getElementById('deceasedPhotoUpload');
const photoPreview = document.getElementById('deceasedPhotoPreview');
    const btnUploadPhoto = document.getElementById('btnUploadDeceasedPhoto');
    const btnDeletePhoto = document.getElementById('btnDeleteDeceasedPhoto');

    // Buttons
    const btnSaveDraft = document.getElementById('btnSaveDraft');
    const btnSubmit = document.getElementById('btnSubmit');

    // Search Autocomplete Elements
    const funeralSearchInput = document.getElementById('funeralSearch');
    const funeralSearchIconWrap = document.getElementById('funeralSearchIconWrap');
    const funeralSearchIcon = document.getElementById('funeralSearchIcon');
    const funeralSearchIconWrapClass =
        'pointer-events-none absolute inset-y-0 right-0 z-[1] flex w-11 items-center justify-center';
    const funeralSearchIconBase = 'text-sm transition';

    const setFuneralSearchIconIdle = () => {
        if (funeralSearchIconWrap) funeralSearchIconWrap.className = funeralSearchIconWrapClass;
        if (funeralSearchIcon) {
            funeralSearchIcon.className = `fa-solid fa-magnifying-glass text-slate-400 ${funeralSearchIconBase}`;
        }
    };
    const setFuneralSearchIconLoading = () => {
        if (funeralSearchIcon) {
            funeralSearchIcon.className = `fa-solid fa-circle-notch fa-spin text-dongban-cyan ${funeralSearchIconBase}`;
        }
    };
    const autocompleteWrapper = document.getElementById('autocompleteWrapper');
    const autocompleteList = document.getElementById('autocompleteList');

    let selectedPhotoFile = null;

    const getInputValue = (id, fallback = '') => {
        const el = document.getElementById(id);
        return el && 'value' in el ? String(el.value) : fallback;
    };
    const getChecked = (id, fallback = false) => {
        const el = document.getElementById(id);
        return el && 'checked' in el ? Boolean(el.checked) : fallback;
    };

    // 1. 영정사진 부분: 터치 영역 확대 (모바일 지원 버그 픽스)
    const openPhotoPicker = () => {
        photoUploadInput.click();
    };
    
    btnUploadPhoto.addEventListener('click', openPhotoPicker);
    photoPreview.addEventListener('click', openPhotoPicker);

    photoUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedPhotoFile = e.target.files[0];
            const reader = new FileReader();

            reader.onload = function(e) {
                photoPreview.style.backgroundImage = `url(${e.target.result})`;
                photoPreview.innerHTML = ''; // 기본 썸네일 아이콘 제거
                btnUploadPhoto.style.display = 'none';
                btnDeletePhoto.style.display = 'flex';
            }
            reader.readAsDataURL(selectedPhotoFile);
        }
    });

    btnDeletePhoto.addEventListener('click', (e) => {
        e.stopPropagation(); // 부모(preview)로 클릭 이벤트 전파 방지
        selectedPhotoFile = null;
        photoUploadInput.value = '';
        photoPreview.style.backgroundImage = '';
        photoPreview.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-1 group-hover:bg-teal-50 group-hover:text-teal-500 transition">
                <i class="fa-solid fa-camera"></i>
            </div>
            <span class="text-[0.65rem] text-slate-400 font-bold">사진 첨부</span>
        `;
        btnUploadPhoto.style.display = 'flex';
        btnDeletePhoto.style.display = 'none';
    });

    // 1-5. 기본 날짜 자동 세팅 로직 (오늘, 내일, 모레)
    const initDefaultDates = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const deathInput = document.getElementById('timeOfDeathDate');
        const entryInput = document.getElementById('timeOfEntryDate');
        const coffinInput = document.getElementById('timeOfCoffinDate');
        const departureInput = document.getElementById('timeOfDepartureDate');

        if (deathInput) deathInput.value = formatDate(today);
        if (entryInput) entryInput.value = formatDate(today);
        if (coffinInput) coffinInput.value = formatDate(tomorrow);
        if (departureInput) departureInput.value = formatDate(dayAfter);
    };

    initDefaultDates();

    attachDatePickersById([
        'timeOfDeathDate',
        'timeOfEntryDate',
        'timeOfCoffinDate',
        'timeOfDepartureDate',
    ]);

    const lineWithMinutes = (dateId, hourId, minuteId) =>
        `${getInputValue(dateId)} ${getInputValue(hourId)}:${getInputValue(minuteId)}`;

    // 2. 폼 데이터 수집 및 구조화 함수
    const collectFormData = (status) => {
        const companyChoice = getInputValue('companySelect');
        const hpMode = getInputValue('directorHomepageMode');

        const formData = {
            deceasedName: getInputValue('deceasedName'),
            deceasedGender: getInputValue('deceasedGender'),
            deceasedAge: getInputValue('deceasedAge'),
            deceasedAgeType: getInputValue('deceasedAgeType'),
            deceasedReligion: getInputValue('deceasedReligion'),
            deceasedReligionPosition: getInputValue('deceasedReligionPosition'),

            funeralSearch: getInputValue('funeralSearch'),
            funeralRoom: getInputValue('funeralRoomMode') || '미정',
            funeralRoomMoveNote: getInputValue('funeralRoomMoveNote'),

            timeOfDeath: `${getInputValue('timeOfDeathDate')} ${getInputValue('timeOfDeathHour')}:00`,
            timeOfEntry: lineWithMinutes('timeOfEntryDate', 'timeOfEntryHour', 'timeOfEntryMinute'),
            timeOfCoffin: getChecked('timeOfCoffinTbd') ? '일시 미정' : lineWithMinutes('timeOfCoffinDate', 'timeOfCoffinHour', 'timeOfCoffinMinute'),
            timeOfDeparture: getChecked('timeOfDepartureTbd') ? '일시 미정' : lineWithMinutes('timeOfDepartureDate', 'timeOfDepartureHour', 'timeOfDepartureMinute'),

            scheduleShowOnObituary: {
                death: getChecked('exposeTimeOfDeath'),
                entry: getChecked('exposeTimeOfEntry'),
                coffin: getChecked('exposeTimeOfCoffin'),
                departure: getChecked('exposeTimeOfDeparture')
            },

            burialLocation: getInputValue('burialLocation'),
            burialDetails: getInputValue('burialDetails'),
            obituaryMemo: getInputValue('obituaryMemo'),

            companySelect: companyChoice,
            companyName: companyChoice === 'custom' ? getInputValue('companyNameCustom').trim() : '',

            directorHomepageMode: hpMode,
            directorHomepageUrl: hpMode === 'register' ? getInputValue('directorHomepageUrl').trim() : '',
            freeHomepageApplication: hpMode === 'none'
                ? {
                    applicantName: getInputValue('freeHpApplicantName').trim(),
                    applicantPhone: getInputValue('freeHpApplicantPhone').trim(),
                    memo: getInputValue('freeHpMemo').trim()
                }
                : null,

            settings: {
                showBirth: getChecked('settingShowBirth', true),
                showPhoto: getChecked('settingShowPhoto', true),
                showLogo: getChecked('settingShowLogo', true),
                showVideo: getChecked('settingShowVideo', true),
                showDirector: getChecked('settingShowDirector', true)
            },

            mournerInfo: (() => {
                try {
                    const raw = localStorage.getItem('ping_mourner_info_draft_v1');
                    return raw ? JSON.parse(raw) : null;
                } catch (_) {
                    return null;
                }
            })(),

            status: status,
            createdAt: serverTimestamp(),
            uid: "TEMP_USER_ID"
        };

        return formData;
    };

    // 3. 서버에 데이터 업로드하는 메인 로직
    const uploadObituary = async (status) => {
        const deceasedName = getInputValue('deceasedName').trim();
        const funeralName = getInputValue('funeralSearch').trim();
        if (status === 'published' && !deceasedName) {
            alert('고인 성함은 필수 항목입니다.');
            document.getElementById('deceasedName').focus();
            return;
        }
        if (status === 'published' && !funeralName) {
            alert('장례식장은 필수 항목입니다.');
            document.getElementById('funeralSearch').focus();
            return;
        }

        try {
            const isDraft = status === 'draft';
            if (isDraft) {
                btnSaveDraft.disabled = true;
                btnSaveDraft.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 저장 중...';
                btnSubmit.disabled = true;
            } else {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 전송 중...';
                btnSaveDraft.disabled = true;
            }

            const obituaryData = collectFormData(status);

            // 3-1. 이미지 업로드 로직 (선택)
            if (selectedPhotoFile) {
                const uniqueFileName = `${Date.now()}_${selectedPhotoFile.name}`;
                const photoRef = ref(storage, `obituaries/photos/${uniqueFileName}`);
                const snapshot = await uploadBytes(photoRef, selectedPhotoFile);
                const downloadURL = await getDownloadURL(snapshot.ref);
                obituaryData.photoUrl = downloadURL;
            }

            // 3-2. Firestore DB 저장 연동
            const docRef = await addDoc(collection(db, "ping_obituaries"), obituaryData);
            
            if (status === 'draft') {
                alert('부고장이 임시저장 되었습니다.');
            } else {
                let mergePublicUrl = '';
                try {
                    if (getInputValue('directorHomepageMode') === 'register') {
                        const raw = getInputValue('directorHomepageUrl').trim();
                        if (raw) {
                            let h = raw.replace(/^\s+|\s+$/g, '');
                            if (!/^https?:\/\//i.test(h)) h = 'https://' + h;
                            try {
                                mergePublicUrl = new URL(h).href;
                            } catch (_) {
                                mergePublicUrl = '';
                            }
                        }
                    }
                } catch (_) {
                    mergePublicUrl = '';
                }
                try {
                    if (
                        typeof PingFlowState !== 'undefined' &&
                        PingFlowState.getRoute() === PingFlowState.ROUTE_OBITUARY_THEN_BULK
                    ) {
                        PingFlowState.mergeToBulkFlow(
                            mergePublicUrl ? { obituaryPublicUrl: mergePublicUrl } : {}
                        );
                        return;
                    }
                } catch (_) {}
                window.location.href = '/obituary-create?completed=1';
            }

        } catch (error) {
            console.error("데이터 저장 중 오류 발생: ", error);
            alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '작성완료';
            btnSaveDraft.disabled = false;
            btnSaveDraft.innerHTML = '임시저장';
        }
    };

    // 4. 장례식장 인라인 검색 자동완성 로직 (Debounce 적용)
    let searchTimeout = null;

    // 외부 클릭 시 자동완성 닫기
    document.addEventListener('click', (e) => {
        if (!funeralSearchInput.contains(e.target) && !autocompleteWrapper.contains(e.target)) {
            autocompleteWrapper.classList.add('hidden');
        }
    });
    
    // 입력창 포커스 시 값이 있으면 다시 열어주기
    funeralSearchInput.addEventListener('focus', () => {
        if (funeralSearchInput.value.trim() && autocompleteList.innerHTML !== '') {
            autocompleteWrapper.classList.remove('hidden');
        }
    });

    funeralSearchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim();
        
        if (keyword) {
            setFuneralSearchIconLoading();
        } else {
            setFuneralSearchIconIdle();
            autocompleteWrapper.classList.add('hidden');
            autocompleteList.innerHTML = '';
        }

        clearTimeout(searchTimeout);
        if (!keyword) return;

        searchTimeout = setTimeout(async () => {
            try {
                const results = await searchFuneralHomes(keyword);
                
                setFuneralSearchIconIdle();
                autocompleteList.innerHTML = '';
                
                if (results.length === 0) {
                    autocompleteList.innerHTML = `
                        <li class="p-4 text-center text-slate-400 text-[0.8rem]">
                            '${keyword}' 검색 결과가 없습니다.
                        </li>
                    `;
                } else {
                    results.forEach(hospital => {
                        const li = document.createElement('li');
                        li.className = "p-3 bg-white rounded-xl cursor-pointer hover:bg-teal-50 border border-transparent hover:border-teal-100 mb-1 last:mb-0 transition group";
                        li.innerHTML = `
                            <div class="flex items-start gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-mint group-hover:text-white transition shadow-sm shrink-0">
                                    <i class="fa-solid fa-building-circle-check text-[0.7rem]"></i>
                                </div>
                                <div class="flex-1 overflow-hidden">
                                    <h4 class="font-bold text-slate-800 text-[0.9rem] mb-0.5 group-hover:text-teal-700 truncate transition">${hospital.name}</h4>
                                    <p class="text-[0.65rem] text-slate-500 truncate"><i class="fa-solid fa-map-location-dot mr-1 text-slate-400"></i>${hospital.address}</p>
                                </div>
                            </div>
                        `;
                        li.addEventListener('click', () => {
                            funeralSearchInput.value = hospital.name;
                            autocompleteWrapper.classList.add('hidden');
                        });
                        autocompleteList.appendChild(li);
                    });
                }
                
                autocompleteWrapper.classList.remove('hidden');
            } catch (error) {
                console.error("검색 오류", error);
                setFuneralSearchIconIdle();
            }
        }, 500); // 0.5초 대기
    });

    // 5. 이벤트 바인딩 (저장)
    btnSaveDraft.addEventListener('click', () => uploadObituary('draft'));
    btnSubmit.addEventListener('click', (e) => {
        e.preventDefault(); // 폼 기본 전송 방지
        uploadObituary('published');
    });
