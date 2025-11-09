// --- GLOBAL STATE ---
let tasks = [];
let settings = {};
let studentJourney = {};
let calendarEvents = [];
let achievements = [];
let projects = [];
let personalInfo = {};
let documents = []; 
let outlines = []; 
let todos = []; // BỔ SUNG: Dữ liệu cho To-do List
let drafts = []; // BỔ SUNG: Dữ liệu cho Bản nháp
let currentTaskFilter = 'all';
let currentTodoFilter = 'all'; // BỔ SUNG: Bộ lọc cho To-do List
let currentlySelectedOutlineId = null;
let currentDraftId = null; // BỔ SUNG: ID của bản nháp đang được chọn
let quillEditor = null; // BỔ SUNG: Instance của trình soạn thảo Quill

let editingItemId = null;
let editingContext = {};
let currentUploadingContext = null;
let confirmAction = null;
let currentWeekDate = new Date();
let currentMonthDate = new Date();
let currentCalendarView = 'week';
let currentAchievementFile = null;
let currentDocumentFile = null;
let customColors = {
    primaryBlue: '#005B96',
    primaryOrange: '#FF7A00'
};

let pomodoroTimer;
let isPomodoroRunning = false;
let isBreak = false;
let focusDuration = 25 * 60;
let breakDuration = 5 * 60;
let timeLeft = focusDuration;

// --- INDEXEDDB DATABASE ---
const dbName = 'personalManagerDB';
const dbVersion = 1;
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = () => reject("Error opening DB");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('appData')) {
                db.createObjectStore('appData', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }
        };
    });
}
async function dbGet(storeName, key) {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(undefined);
    });
}
async function dbSet(storeName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject("Error writing data: " + e.target.error);
    });
}
async function dbDelete(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Error deleting data");
    });
}
async function dbGetAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Error getting all data");
    });
}
async function dbClear(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Error clearing store");
    });
}

// --- SV5T CRITERIA DATA ---
const sv5tCriteriaData = {
    khoa: {
        name: "Cấp Khoa",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [{ id: 'khoa_ethics_1', text: 'Điểm rèn luyện >= 80' }]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'khoa_study_1', text: 'Điểm TB chung học tập >= 7.5' }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'khoa_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'khoa_physical_2', text: 'Tham gia hoạt động thể thao từ cấp Khoa trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'khoa_volunteer_1', text: 'Hoàn thành 1 trong các chiến dịch tình nguyện' },
                        { id: 'khoa_volunteer_2', text: 'Tham gia ít nhất 03 ngày tình nguyện/năm' },
                    ]
                }]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                optionalGroups: [
                    {
                        description: 'Về ngoại ngữ (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'khoa_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' },
                            { id: 'khoa_integration_2', text: 'Điểm tổng kết các học phần ngoại ngữ >= 7.0' },
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'khoa_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'khoa_integration_5', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    }
                ]
            }
        }
    },
    truong: {
        name: "Cấp Trường",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [
                    { id: 'truong_ethics_1', text: 'Điểm rèn luyện >= 80' },
                    { id: 'truong_ethics_2', text: 'Xếp loại Đoàn viên/Hội viên xuất sắc' }
                ]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'truong_study_1', text: 'Điểm TB chung học tập >= 7.75' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'truong_study_2', text: 'Có đề tài NCKH hoặc luận văn tốt nghiệp' },
                        { id: 'truong_study_4', text: 'Đạt giải cuộc thi học thuật cấp Khoa trở lên' },
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'truong_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'truong_physical_3', text: 'Đạt giải thể thao cấp Khoa trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                     options: [
                        { id: 'truong_volunteer_1', text: 'Hoàn thành 1 trong các chiến dịch tình nguyện' },
                        { id: 'truong_volunteer_2', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' },
                    ]
                }]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                optionalGroups: [
                    {
                        description: 'Về ngoại ngữ (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'truong_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' },
                            { id: 'truong_integration_2', text: 'Điểm tổng kết các học phần ngoại ngữ >= 8.0' },
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'truong_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'truong_integration_5', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    },
                    {
                        description: 'Về hoạt động hội nhập (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'truong_integration_6', text: 'Tham gia ít nhất 1 hoạt động hội nhập' },
                            { id: 'truong_integration_8', text: 'Tham gia giao lưu quốc tế' }
                        ]
                    }
                ]
            }
        }
    },
    dhqg: {
        name: "Cấp ĐHQG",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [
                    { id: 'dhqg_ethics_1', text: 'Điểm rèn luyện >= 80' },
                    { id: 'dhqg_ethics_2', text: 'Đoàn viên/Hội viên hoàn thành xuất sắc nhiệm vụ' }
                ]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'dhqg_study_1', text: 'Điểm TB chung học tập >= 8.0' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'dhqg_study_2', text: 'NCKH/Khóa luận tốt nghiệp >= 7.0' },
                        { id: 'dhqg_study_3', text: 'Đạt giải Ba học thuật cấp Khoa trở lên' },
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'dhqg_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'dhqg_physical_2', text: 'Đạt giải thể thao cấp Trường trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                     options: [
                        { id: 'dhqg_volunteer_1', text: 'Được khen thưởng tình nguyện cấp Trường trở lên' },
                        { id: 'dhqg_volunteer_2', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' }
                    ]
                }]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                required: [{ id: 'dhqg_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' }],
                optionalGroups: [
                    {
                        description: 'Về hội nhập (đạt thêm 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'dhqg_integration_2', text: 'Tham gia ít nhất 1 hoạt động giao lưu quốc tế' },
                            { id: 'dhqg_integration_3', text: 'Đạt giải Ba hội nhập/NN cấp Trường trở lên' }
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt thêm 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'dhqg_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'dhqg_integration_6', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    }
                ]
            }
        }
    },
    thanhpho: {
        name: "Cấp Thành phố",
        criteria: {
             ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [
                    { id: 'tp_ethics_1', text: 'Điểm rèn luyện >= 90' },
                    { id: 'tp_ethics_2', text: 'Đoàn viên/Hội viên hoàn thành xuất sắc nhiệm vụ' }
                ],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tp_ethics_3', text: 'Là thành viên đội thi Mác-Lênin, TTHCM' },
                        { id: 'tp_ethics_4', text: 'Là Thanh niên tiên tiến làm theo lời Bác' }
                    ]
                }]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'tp_study_1', text: 'Điểm TB chung học tập >= 8.5' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tp_study_2', text: 'NCKH/Khóa luận tốt nghiệp >= 8.0' },
                        { id: 'tp_study_3', text: 'Đạt giải Euréka hoặc NCKH cấp Thành trở lên' },
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tp_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'tp_physical_2', text: 'Đạt giải thể thao cấp Trường trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                required: [
                    { id: 'tp_volunteer_1', text: 'Được khen thưởng tình nguyện cấp Trường trở lên' },
                    { id: 'tp_volunteer_2', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' }
                ]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                required: [
                    { id: 'tp_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' },
                    { id: 'tp_integration_5', text: 'Tham gia ít nhất 01 hoạt động hội nhập' }
                ],
                optionalGroups: [
                    {
                        description: 'Về ngoại ngữ (đạt thêm 1 trong 2):',
                        options: [
                            { id: 'tp_integration_2', text: 'Tham gia ít nhất 1 hoạt động giao lưu quốc tế' },
                            { id: 'tp_integration_3', text: 'Đạt giải Ba hội nhập/NN cấp Trường trở lên' }
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt 1 trong 2):',
                        options: [
                            { id: 'tp_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'tp_integration_6', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    }
                ]
            }
        }
    },
    trunguong: {
        name: "Cấp Trung ương",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [{ id: 'tw_ethics_1', text: 'Điểm rèn luyện >= 90' }],
                 optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tw_ethics_2', text: 'Là thành viên đội thi Mác-Lênin, TTHCM' },
                        { id: 'tw_ethics_3', text: 'Là thanh niên tiêu biểu/tiên tiến' }
                    ]
                }]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'tw_study_1', text: 'Điểm TB chung học tập >= 8.5 (ĐH) hoặc >= 8.0 (CĐ)' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tw_study_2', text: 'NCKH đạt loại Tốt cấp Trường trở lên' },
                        { id: 'tw_study_5', text: 'Là thành viên đội tuyển thi học thuật quốc gia, quốc tế' }
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tw_physical_1', text: 'Đạt danh hiệu "Sinh viên khỏe" cấp Trường trở lên' },
                        { id: 'tw_physical_2', text: 'Đạt danh hiệu "Sinh viên khỏe" cấp Tỉnh trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                required: [
                    { id: 'tw_volunteer_1', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' },
                    { id: 'tw_volunteer_2', text: 'Được khen thưởng tình nguyện cấp Huyện/Trường trở lên' }
                ]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                required: [
                    { id: 'tw_integration_1', text: 'Hoàn thành 1 khóa kỹ năng hoặc được khen thưởng' },
                    { id: 'tw_integration_2', text: 'Tham gia ít nhất 01 hoạt động hội nhập' },
                    { id: 'tw_integration_3', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' }
                ],
                optionalGroups: [
                    {
                        description: 'Đạt thêm 1 trong 2 tiêu chuẩn sau:',
                        options: [
                            { id: 'tw_integration_4', text: 'Tham gia ít nhất 1 hoạt động giao lưu quốc tế' },
                            { id: 'tw_integration_5', text: 'Đạt giải Ba hội nhập/NN cấp Trường trở lên' }
                        ]
                    }
                ]
            }
        }
    }
};

// --- APP INITIALIZATION & AUTH ---
function handleLogin() {
    sessionStorage.setItem("isLoggedIn", "true");
    document.getElementById("login-error").style.display = "none";
    document.getElementById("loading-spinner").style.display = "flex";
    setTimeout(showApp, 500);
}

function handleLogout() {
    showConfirmModal("Bạn có chắc chắn muốn đăng xuất?", () => {
        sessionStorage.removeItem("isLoggedIn");
        showLoginScreen();
    });
}

async function showApp() {
    document.getElementById("loading-spinner").style.display = "none";
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "flex";
    await loadAllData();
}

function showLoginScreen() {
    document.getElementById("login-container").style.display = "flex";
    document.getElementById("app-container").style.display = "none";
    document.getElementById("loading-spinner").style.display = "none";
}

function showSection(sectionId, clickedButton) {
    document.querySelectorAll(".content-section").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));
    document.querySelectorAll('.nav-group').forEach(el => el.classList.remove('has-active-child'));

    document.getElementById(sectionId).classList.add("active");
    if (clickedButton) {
        clickedButton.classList.add("active");
        const parentGroup = clickedButton.closest('.nav-group');
        if (parentGroup) {
            parentGroup.classList.add('has-active-child');
            parentGroup.classList.add('open');
        }
    }

    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'personal-info') renderPersonalInfo();
    if (sectionId === 'tasks') renderTasks();
    if (sectionId === 'todo-list') renderTodoList(); // BỔ SUNG
    if (sectionId === 'drafts') renderDrafts(); // BỔ SUNG
    if (sectionId === 'projects') renderProjects();
    if (sectionId === 'focus-mode') renderFocusMode();
    if (sectionId === 'time-management') renderCalendar();
    if (sectionId === 'digital-library') renderDigitalLibrary();
    if (sectionId === 'outline-composer') renderOutlineComposer();
    if (sectionId === 'student-journey') renderStudentJourney();
    if (sectionId === 'achievements') renderAchievements();
    if (sectionId === 'proofs-management') renderProofsManagement();
    if (sectionId === 'statistics') renderStatistics();
    if (sectionId === 'settings') renderSettings();
}

// --- UTILITIES (Time, Location, etc.) ---
function updateTimeAndLocation(){
    const e=document.getElementById("current-time");
    const t=document.getElementById("current-date");
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const n=new Date;
    e&&(e.innerHTML=`<span>🕒</span> ${n.toLocaleTimeString("vi-VN")}`);
    t&&(t.innerHTML=`<span>📅</span> ${formatDateToDDMMYYYY(n)}`);
    
    if (sidebarUserName && personalInfo.fullName) {
        sidebarUserName.textContent = personalInfo.fullName;
    } else if (sidebarUserName) {
        sidebarUserName.textContent = 'Người dùng';
    }
}
async function getLocation(){const e=document.getElementById("current-location");e&&navigator.geolocation&&navigator.geolocation.getCurrentPosition(async t=>{const{latitude:n,longitude:o}=t.coords;try{const t=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${n}&lon=${o}`),a=await t.json();e.innerHTML=`<span>📍</span> ${a.address.city||a.address.town||a.address.village||"Không xác định"}`}catch(t){e.innerHTML="<span>📍</span> Không thể lấy vị trí"}},()=>{e.innerHTML="<span>📍</span> Vị trí bị từ chối"})}

// --- DATA MANAGEMENT (Load, Save, Import, Export) ---
async function saveAllData(){try{const e={key:"mainData",tasks,settings,studentJourney,calendarEvents,achievements, projects, personalInfo, customColors, documents, outlines, todos, drafts}; await dbSet("appData",e)}catch(e){console.error("Lỗi khi lưu dữ liệu:",e),showNotification("Không thể lưu dữ liệu!","error")}}
async function loadAllData(){
    try {
        const e = await dbGet("appData", "mainData");
        if (e) {
            tasks = e.tasks || [];
            settings = e.settings || {};
            studentJourney = e.studentJourney || {};
            calendarEvents = e.calendarEvents || [];
            achievements = e.achievements || [];
            projects = e.projects || [];
            personalInfo = e.personalInfo || {};
            documents = e.documents || []; 
            outlines = e.outlines || [];
            todos = e.todos || []; // BỔ SUNG
            drafts = e.drafts || []; // BỔ SUNG
            customColors = e.customColors || customColors;
        }
    } catch(e) {
        console.error("Lỗi khi tải dữ liệu:",e);
    } finally {
        initializeDefaultData();
        await loadProfilePicture();
        applyDarkModeSetting();
        applyCustomColors();
        renderAll();
        generateRecurringTasks();
        scheduleNotifications();
    }
}
function initializeDefaultData() {
    if (!settings.categories || settings.categories.length === 0) settings.categories = ['Cá nhân', 'Công việc', 'Học tập'];
    if (!settings.statuses || settings.statuses.length === 0) settings.statuses = ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành'];
    if (settings.darkMode === undefined) settings.darkMode = false;
    if (settings.notificationsEnabled === undefined) settings.notificationsEnabled = false;
    if (!calendarEvents) calendarEvents = [];
    if (!achievements) achievements = [];
    if (!projects) projects = [];
    if (!documents) documents = [];
    if (!outlines) outlines = [];
    if (!todos) todos = []; // BỔ SUNG
    if (!drafts) drafts = []; // BỔ SUNG
    if (!personalInfo || Object.keys(personalInfo).length === 0) {
        personalInfo = {
            fullName: 'Lâm Quốc Minh',
            dob: '',
            email: 'lamquocminh@example.com',
            phone: '',
            occupation: '',
            socialLink: ''
        };
    }
    if (!studentJourney.levels) studentJourney.levels = {};
    if (!customColors) customColors = { primaryBlue: '#005B96', primaryOrange: '#FF7A00' };

    tasks.forEach(task => {
        if (!task.lastGeneratedDate) {
            task.lastGeneratedDate = task.dueDate;
        }
        if (!task.priority) task.priority = 'medium';
        if (!task.tags) task.tags = [];
        if (!task.recurrence) task.recurrence = { type: 'none' };
        if (!task.projectId) task.projectId = '';
    });

    Object.keys(sv5tCriteriaData).forEach(levelId => {
        const levelTemplate = sv5tCriteriaData[levelId];
        if (!studentJourney.levels[levelId]) {
            studentJourney.levels[levelId] = { name: levelTemplate.name, status: 'Chưa đủ điều kiện', criteria: {} };
        }
        Object.keys(levelTemplate.criteria).forEach(criteriaId => {
            if (!studentJourney.levels[levelId].criteria[criteriaId]) {
                studentJourney.levels[levelId].criteria[criteriaId] = { conditions: [] };
            }
            const template = levelTemplate.criteria[criteriaId];
            let allConditions = [];
            if (template.required) allConditions.push(...template.required.map(c => ({ ...c, type: 'required' })));
            if (template.optionalGroups) {
                template.optionalGroups.forEach((group, groupIndex) => {
                    allConditions.push(...group.options.map(opt => ({ ...opt, type: 'optional', optionalGroupId: `${criteriaId}_${groupIndex}` })));
                });
            }
            const savedConditions = studentJourney.levels[levelId].criteria[criteriaId].conditions;
            const finalConditions = allConditions.map(templateCond => {
                const savedCond = savedConditions.find(sc => sc.id === templateCond.id);
                return savedCond ? savedCond : { ...templateCond, completed: false, proofs: [] };
            });
            studentJourney.levels[levelId].criteria[criteriaId].conditions = finalConditions;
        });
    });
    updateLevelStatus(false);
}
function renderAll(){
    updateTimeAndLocation();
    renderDashboard();
    renderPersonalInfo();
    renderTasks();
    renderTodoList(); // BỔ SUNG
    renderDrafts(); // BỔ SUNG
    renderProjects();
    renderFocusMode();
    renderCalendar();
    renderDigitalLibrary(); 
    renderOutlineComposer();
    renderStudentJourney();
    renderAchievements();
    renderProofsManagement();
    renderStatistics();
    renderSettings();
    updateTaskTicker();
}
async function exportDataToFile(){try{const e=await dbGet("appData","mainData"),t=[];for(const n of await dbGetAll("files")){const e=await fileToBase64(n.file);t.push({id:n.id,name:n.file.name,type:n.file.type,data:e})}const n={mainData:e,files:t},o=JSON.stringify(n,null,2),a=new Blob([o],{type:"application/json"}),d=URL.createObjectURL(a),i=document.createElement("a");i.href=d,i.download=`DuLieu-QuanLy-${(new Date).toISOString().slice(0,10)}.json`,i.click(),URL.revokeObjectURL(d),showNotification("Xuất dữ liệu thành công!","success")}catch(e){console.error(e),showNotification("Xuất dữ liệu thất bại!","error")}}function importDataFromFile(){document.getElementById("import-file-input").click()}
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            showConfirmModal('Bạn có chắc muốn nhập dữ liệu? Dữ liệu hiện tại sẽ bị ghi đè.', async () => {
                await dbClear('appData');
                await dbClear('files');

                if (data.mainData) {
                    await dbSet('appData', data.mainData);
                }
                if (data.files && Array.isArray(data.files)) {
                    for(const fileInfo of data.files) {
                        const file = base64ToFile(fileInfo.data, fileInfo.name, fileInfo.type);
                        await dbSet('files', { id: fileInfo.id, file: file });
                    }
                }
                await loadAllData();
                showNotification('Nhập dữ liệu thành công!', 'success');
            });
        } catch (error) {
            console.error(error);
            showNotification('File dữ liệu không hợp lệ!', 'error');
        }
    };
    reader.readAsText(file);
}
async function clearAllData(){
    showConfirmModal("BẠN CÓ CHẮC MUỐN XÓA TOÀN BỘ DỮ LIỆU? Hành động này không thể hoàn tác!", async () => {
        await dbClear("appData");
        await dbClear("files");
        tasks = [];
        settings = {};
        studentJourney = {};
        calendarEvents = [];
        achievements = [];
        projects = [];
        personalInfo = {};
        documents = [];
        outlines = [];
        todos = []; // BỔ SUNG
        drafts = []; // BỔ SUNG
        customColors = { primaryBlue: '#005B96', primaryOrange: '#FF7A00' };
        await loadAllData();
        showNotification("Đã xóa toàn bộ dữ liệu.", "success");
    });
}

// --- PERSONAL INFORMATION MANAGEMENT ---
function renderPersonalInfo() {
    const fullNameEl = document.getElementById('pi-full-name');
    const dobEl = document.getElementById('pi-dob');
    const emailEl = document.getElementById('pi-email');
    const phoneEl = document.getElementById('pi-phone');
    const occupationEl = document.getElementById('pi-occupation');
    const socialEl = document.getElementById('pi-social');
    if(fullNameEl) fullNameEl.textContent = personalInfo.fullName || 'Chưa có';
    if(dobEl) dobEl.textContent = personalInfo.dob ? formatYYYYMMDD_to_DDMMYYYY(personalInfo.dob) : 'Chưa có';
    if(emailEl) emailEl.textContent = personalInfo.email || 'Chưa có';
    if(phoneEl) phoneEl.textContent = personalInfo.phone || 'Chưa có';
    if(occupationEl) occupationEl.textContent = personalInfo.occupation || 'Chưa có';
    if(socialEl) socialEl.innerHTML = personalInfo.socialLink ? `<a href="${personalInfo.socialLink}" target="_blank" rel="noopener noreferrer">${personalInfo.socialLink}</a>` : 'Chưa có';
    updateTimeAndLocation();
}

// --- TASK MANAGEMENT ---
async function quickAddTask() {
    const input = document.getElementById('quick-add-task-input');
    const name = input.value.trim();
    if (!name) return;
    const newTask = { id: crypto.randomUUID(), name: name, category: settings.categories[0] || 'Cá nhân', dueDate: null, status: settings.statuses[0] || 'Chưa thực hiện', priority: 'medium', recurrence: { type: 'none' }, lastGeneratedDate: null, tags: [], projectId: '', link: '', notes: '', completionDate: null };
    tasks.push(newTask);
    await saveAllData();
    renderTasks();
    renderCalendar();
    renderDashboard();
    renderStatistics();
    input.value = '';
    showNotification(`Đã thêm nhanh công việc: "${escapeHTML(name)}"`, "success");
}
function filterTasks(filterType) {
    currentTaskFilter = filterType;
    document.querySelectorAll('#task-filter-controls .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeButton = document.querySelector(`#task-filter-controls .filter-btn[onclick="filterTasks('${filterType}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    renderTasks();
}
async function generateRecurringTasks() {
    const today = toLocalISOString(new Date());
    let updated = false;
    tasks = tasks.flatMap(task => {
        if (task.recurrence && task.recurrence.type !== 'none' && task.lastGeneratedDate < today) {
            let nextDueDate = new Date(task.lastGeneratedDate);
            let currentDueDate = new Date(task.dueDate);
            let newTasks = [];
            while (toLocalISOString(nextDueDate) < today) {
                if (task.recurrence.type === 'daily') {
                    nextDueDate.setDate(nextDueDate.getDate() + 1);
                    currentDueDate.setDate(currentDueDate.getDate() + 1);
                } else if (task.recurrence.type === 'weekly') {
                    nextDueDate.setDate(nextDueDate.getDate() + 7);
                    currentDueDate.setDate(currentDueDate.getDate() + 7);
                } else if (task.recurrence.type === 'monthly') {
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                    currentDueDate.setMonth(currentDueDate.getMonth() + 1);
                }
                if (toLocalISOString(nextDueDate) <= today) {
                    newTasks.push({ id: crypto.randomUUID(), name: task.name, category: task.category, dueDate: toLocalISOString(currentDueDate), status: settings.statuses[0], priority: task.priority, tags: [...task.tags], link: task.link, notes: task.notes, recurrence: { type: 'none' }, originalRecurringId: task.id, projectId: task.projectId || '', completionDate: null, lastGeneratedDate: toLocalISOString(nextDueDate) });
                    updated = true;
                }
            }
            task.lastGeneratedDate = today;
            return [task, ...newTasks];
        }
        return [task];
    });
    if (updated) {
        await saveAllData();
        renderAll();
        showNotification('Đã tạo các công việc định kỳ mới!', 'info');
    }
}
async function addTask() {
    const nameInput = document.getElementById('task-name');
    const name = nameInput.value.trim();
    if (!name) {
        document.getElementById('task-name-error').textContent = "Tên công việc không được để trống.";
        document.getElementById('task-name-error').style.display = "block";
        return;
    }
    document.getElementById('task-name-error').style.display = "none";
    const addBtn = document.getElementById('add-task-btn');
    addBtn.classList.add("loading");
    addBtn.disabled = true;
    const newTask = { id: crypto.randomUUID(), name: name, category: document.getElementById('task-category').value, dueDate: document.getElementById('task-due-date').value, status: document.getElementById('task-status').value, priority: document.getElementById('task-priority').value, recurrence: { type: document.getElementById('task-recurrence').value, interval: 1, endDate: null }, lastGeneratedDate: document.getElementById('task-due-date').value, tags: document.getElementById('task-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag !== ''), projectId: document.getElementById('task-project').value || '', link: document.getElementById('task-link').value.trim(), notes: document.getElementById('task-notes').value.trim(), completionDate: null };
    tasks.push(newTask);
    await saveAllData();
    renderTasks();
    renderProjects();
    renderCalendar();
    renderDashboard();
    renderStatistics();
    nameInput.value = "";
    document.getElementById('task-link').value = "";
    document.getElementById('task-due-date').value = "";
    document.getElementById('task-notes').value = "";
    document.getElementById('task-tags').value = "";
    document.getElementById('task-priority').value = "medium";
    document.getElementById('task-recurrence').value = "none";
    document.getElementById('task-project').value = "";
    nameInput.focus();
    showNotification("Thêm công việc thành công!", "success");
    addBtn.classList.remove("loading");
    addBtn.disabled = false;
    scheduleNotifications();
}
function deleteTask(e){showConfirmModal("Bạn có chắc chắn muốn xóa công việc này?",async()=>{tasks=tasks.filter(t=>t.id!==e),await saveAllData(),renderTasks(),renderProjects(),renderCalendar(),renderDashboard(),renderStatistics(),showNotification("Đã xóa công việc.","success"),scheduleNotifications()})}async function completeTask(e){const t=tasks.find(t=>t.id===e);t&&(t.status=settings.statuses[settings.statuses.length-1],t.completionDate=(new Date).toISOString(),await saveAllData(),renderTasks(),renderProjects(),renderDashboard(),renderStatistics(),scheduleNotifications())}
function updateTaskTicker(){const e=document.querySelector(".task-ticker-container"),t=document.querySelector(".task-ticker");if(!t||!e)return;const n=tasks.filter(e=>e.status!==settings.statuses[settings.statuses.length-1]);n.length>0?(t.textContent="Công việc chưa xong: "+n.map(e=>e.name).join(" • "),e.style.display="block"):(e.style.display="none")}
function renderTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;
    const taskProjectSelect = document.getElementById('task-project');
    if (taskProjectSelect) {
        taskProjectSelect.innerHTML = '<option value="">Không có</option>' + projects.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
    }
    let filteredTasks;
    const todayStr = toLocalISOString(new Date());
    switch (currentTaskFilter) {
        case 'today': filteredTasks = tasks.filter(task => task.dueDate === todayStr); break;
        case 'important': filteredTasks = tasks.filter(task => task.priority === 'high'); break;
        case 'incomplete': const completedStatus = settings.statuses[settings.statuses.length - 1]; filteredTasks = tasks.filter(task => task.status !== completedStatus); break;
        case 'all': default: filteredTasks = [...tasks]; break;
    }
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary); padding: 2rem 0;">Không có công việc nào phù hợp với bộ lọc hiện tại.</p>';
        updateTaskTicker();
        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    filteredTasks.sort((a, b) => {
        const prioDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (prioDiff !== 0) return prioDiff;
        const dateA = a.dueDate ? new Date(a.dueDate) : null;
        const dateB = b.dueDate ? new Date(b.dueDate) : null;
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1; 
        if (dateB) return 1;
        return 0;
    });
    const fragment = document.createDocumentFragment();
    filteredTasks.forEach(task => {
        const item = document.createElement('div');
        let dueDateClass = "";
        let dueDateWarning = "";
        const isCompleted = task.status === settings.statuses[settings.statuses.length - 1];
        if (task.dueDate && !isCompleted) {
            const taskDueDate = new Date(task.dueDate);
            taskDueDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.ceil((taskDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff < 0) {
                dueDateWarning = `<span class="overdue-warning">⚠️ Quá hạn ${Math.abs(daysDiff)} ngày</span>`;
                dueDateClass = "overdue";
            } else if (daysDiff <= 3) {
                dueDateWarning = `<span class="due-warning">⚠️ Sắp hết hạn (còn ${daysDiff} ngày)</span>`;
                dueDateClass = "due-soon";
            }
        }
        const statusColor = isCompleted ? 'var(--success-color)' : (settings.statuses.indexOf(task.status) > 0 ? 'var(--warning-color)' : 'var(--dark-gray)');
        item.className = `task-item ${dueDateClass} ${isCompleted ? "completed" : ""}`;
        let priorityBadge = '';
        if (task.priority && task.priority !== 'none') {
            let priorityText = '';
            if (task.priority === 'high') priorityText = 'Cao';
            else if (task.priority === 'medium') priorityText = 'TB';
            else if (task.priority === 'low') priorityText = 'Thấp';
            priorityBadge = `<span class="priority-badge ${task.priority}">Ưu tiên: ${priorityText}</span>`;
        }
        const tagsHtml = (task.tags && task.tags.length > 0) ? `<div class="task-detail"><span>Thẻ</span><p>${task.tags.map(tag => `<span class="tag-badge">${escapeHTML(tag)}</span>`).join('')}</p></div>` : '';
        const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
        const projectHtml = project ? `<div class="task-detail"><span>Dự án</span><p>${escapeHTML(project.name)}</p></div>` : '';
        item.innerHTML = `
            <div class="task-header"><h3>${escapeHTML(task.name)} ${priorityBadge} ${dueDateWarning}</h3><div class="task-actions"><button class="edit-btn">Sửa</button><button class="delete-btn">Xóa</button>${isCompleted ? "" : `<button class="complete-btn">Hoàn thành</button>`}</div></div>
            <div class="task-body">
                <div class="task-detail"><span>Phân loại</span><p><span class="category-tag" style="background-color: ${stringToHslColor(task.category)};">${escapeHTML(task.category)}</span></p></div>
                <div class="task-detail"><span>Hạn chót</span><p>${formatYYYYMMDD_to_DDMMYYYY(task.dueDate) || "Chưa có"}</p></div>
                <div class="task-detail"><span>Tiến độ</span><p><span class="status" style="background-color: ${statusColor};">${escapeHTML(task.status)}</span></p></div>
                ${(task.recurrence && task.recurrence.type !== 'none') ? `<div class="task-detail"><span>Lặp lại</span><p>${mapRecurrenceType(task.recurrence.type)}</p></div>` : ''}
                ${projectHtml}
                ${isCompleted && task.completionDate ? `<div class="task-detail"><span>Ngày hoàn thành</span><p>${formatISOToVietnamese(task.completionDate)}</p></div>` : ""}
                <div class="task-detail" style="grid-column: 1 / -1;"><span>Đính kèm</span><p>${task.link ? `<a href="${task.link}" target="_blank" rel="noopener noreferrer">${escapeHTML(task.link)}</a>` : "Không có"}</p></div>
                ${tagsHtml}
                ${task.notes ? `<div class="task-notes-container"><button class="toggle-notes-btn">Xem ghi chú</button><div class="task-notes" style="display: none;"><pre>${escapeHTML(task.notes)}</pre></div></div>` : ''}
            </div>`;
        item.querySelector('.edit-btn').onclick = () => openEditModal('task', task.id);
        item.querySelector('.delete-btn').onclick = () => deleteTask(task.id);
        if (!isCompleted) { item.querySelector('.complete-btn').onclick = () => completeTask(task.id); }
        if (task.notes) {
            item.querySelector('.toggle-notes-btn').addEventListener('click', function() {
                const notesDiv = this.nextElementSibling;
                const isHidden = notesDiv.style.display === 'none';
                notesDiv.style.display = isHidden ? 'block' : 'none';
                this.textContent = isHidden ? 'Ẩn ghi chú' : 'Xem ghi chú';
            });
        }
        fragment.appendChild(item);
    });
    taskList.innerHTML = "";
    taskList.appendChild(fragment);
    updateTaskTicker();
}

// --- BỔ SUNG: TO-DO LIST ---
function filterTodoList(filter) {
    currentTodoFilter = filter;
    document.querySelectorAll('#todo-filter-controls .filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#todo-filter-controls .filter-btn[onclick="filterTodoList('${filter}')"]`).classList.add('active');
    renderTodoList();
}

async function addTodoItem() {
    const input = document.getElementById('new-todo-input');
    const text = input.value.trim();
    if (!text) return;

    const newTodo = {
        id: `todo_${crypto.randomUUID()}`,
        text: text,
        completed: false
    };
    todos.push(newTodo);
    await saveAllData();
    renderTodoList();
    input.value = '';
    showNotification('Đã thêm việc cần làm.', 'success');
}

async function toggleTodoStatus(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        await saveAllData();
        renderTodoList();
    }
}

function deleteTodoItem(id) {
    showConfirmModal('Bạn có chắc muốn xóa việc này?', async () => {
        todos = todos.filter(t => t.id !== id);
        await saveAllData();
        renderTodoList();
        showNotification('Đã xóa việc cần làm.', 'success');
    });
}

function renderTodoList() {
    const container = document.getElementById('todo-list-container');
    if (!container) return;

    let filteredTodos = todos;
    if (currentTodoFilter === 'active') {
        filteredTodos = todos.filter(t => !t.completed);
    } else if (currentTodoFilter === 'completed') {
        filteredTodos = todos.filter(t => t.completed);
    }

    if (filteredTodos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary); padding: 2rem 0;">Không có mục nào.</p>';
        return;
    }

    container.innerHTML = filteredTodos.map(todo => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}">
            <input type="checkbox" class="todo-checkbox" onchange="toggleTodoStatus('${todo.id}')" ${todo.completed ? 'checked' : ''}>
            <label class="todo-label">${escapeHTML(todo.text)}</label>
            <button class="delete-todo-btn" onclick="deleteTodoItem('${todo.id}')">&times;</button>
        </div>
    `).join('');
}

// --- BỔ SUNG: DRAFTS (BẢN NHÁP) ---
function initializeDrafts() {
    if (quillEditor) return; // Chỉ khởi tạo một lần

    quillEditor = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Bắt đầu viết bản nháp của bạn ở đây...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{'list': 'ordered'}, {'list': 'bullet'}],
                ['link', 'blockquote'],
                ['clean']
            ]
        }
    });

    // Tự động lưu nội dung
    quillEditor.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
            handleDraftChange();
        }
    });

    // Tự động lưu tiêu đề
    document.getElementById('draft-title-input').addEventListener('input', handleDraftTitleChange);
}

function renderDrafts() {
    initializeDrafts();
    renderDraftsList();
    renderDraftEditor();
}

function renderDraftsList() {
    const container = document.getElementById('drafts-list-column');
    const searchTerm = document.getElementById('drafts-search').value.toLowerCase();

    const filteredDrafts = drafts
        .filter(d => d.title.toLowerCase().includes(searchTerm))
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    if (filteredDrafts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary); padding: 1rem;">Chưa có bản nháp nào.</p>';
        return;
    }

    container.innerHTML = filteredDrafts.map(draft => {
        const title = draft.title || 'Bản nháp không có tiêu đề';
        return `
            <div class="outline-list-item ${draft.id === currentDraftId ? 'active' : ''}" onclick="selectDraft('${draft.id}')">
                ${escapeHTML(title)}
                <button class="delete-outline-btn" onclick="event.stopPropagation(); deleteDraft('${draft.id}')">×</button>
            </div>
        `;
    }).join('');
}

function renderDraftEditor() {
    const welcomeScreen = document.getElementById('drafts-editor-welcome');
    const editorContent = document.getElementById('drafts-editor-content');
    const titleInput = document.getElementById('draft-title-input');
    const statusEl = document.getElementById('draft-status');

    if (!currentDraftId) {
        welcomeScreen.style.display = 'flex';
        editorContent.style.display = 'none';
        return;
    }
    
    welcomeScreen.style.display = 'none';
    editorContent.style.display = 'flex';

    const draft = drafts.find(d => d.id === currentDraftId);
    if (draft) {
        titleInput.value = draft.title;
        quillEditor.setContents(draft.content);
        statusEl.textContent = `Lưu lần cuối: ${new Date(draft.lastModified).toLocaleTimeString('vi-VN')}`;
    }
}

async function createNewDraft() {
    const newDraft = {
        id: `draft_${crypto.randomUUID()}`,
        title: 'Bản nháp không có tiêu đề',
        content: { ops: [] }, // Nội dung trống của Quill
        lastModified: new Date().toISOString()
    };
    drafts.push(newDraft);
    currentDraftId = newDraft.id;
    await saveAllData();
    renderDrafts();
}

function selectDraft(id) {
    currentDraftId = id;
    renderDraftsList(); // Cập nhật highlight
    renderDraftEditor(); // Tải nội dung
}

let saveTimeout;
function handleDraftChange() {
    if (!currentDraftId) return;
    const draft = drafts.find(d => d.id === currentDraftId);
    if(draft) {
        draft.content = quillEditor.getContents();
        draft.lastModified = new Date().toISOString();
        document.getElementById('draft-status').textContent = 'Đang lưu...';
        
        // Debounce saving to avoid too many writes
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await saveAllData();
            document.getElementById('draft-status').textContent = `Lưu lần cuối: ${new Date(draft.lastModified).toLocaleTimeString('vi-VN')}`;
        }, 1000); // Lưu sau 1 giây không gõ
    }
}

async function handleDraftTitleChange() {
    if (!currentDraftId) return;
    const draft = drafts.find(d => d.id === currentDraftId);
    if(draft) {
        draft.title = document.getElementById('draft-title-input').value;
        draft.lastModified = new Date().toISOString();
        await saveAllData();
        renderDraftsList(); // Cập nhật lại danh sách để hiển thị tiêu đề mới
    }
}

function deleteDraft(id) {
    showConfirmModal('Bạn có chắc muốn xóa bản nháp này?', async () => {
        drafts = drafts.filter(d => d.id !== id);
        if (currentDraftId === id) {
            currentDraftId = null;
        }
        await saveAllData();
        renderDrafts();
        showNotification('Đã xóa bản nháp.', 'success');
    });
}

// --- PROJECT MANAGEMENT, CALENDAR, SV5T, PROOFS, ACHIEVEMENTS ---
function renderProjects() {
    const projectListContainer = document.getElementById('project-list-container');
    const projectListEmpty = document.getElementById('project-list-empty');
    if (!projectListContainer) return;
    projectListContainer.innerHTML = '';
    if (projects.length === 0) {
        projectListEmpty.style.display = 'block';
        return;
    }
    projectListEmpty.style.display = 'none';
    projects.forEach(project => {
        const projectTasks = tasks.filter(task => task.projectId === project.id);
        const completedTasksCount = projectTasks.filter(task => task.status === settings.statuses[settings.statuses.length - 1]).length;
        const progress = projectTasks.length > 0 ? (completedTasksCount / projectTasks.length) * 100 : 0;
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.onclick = () => openProjectModal(project.id);
        projectCard.innerHTML = `
            <h3>${escapeHTML(project.name)}</h3>
            <p class="project-dates">Từ: ${formatYYYYMMDD_to_DDMMYYYY(project.startDate)} - Đến: ${formatYYYYMMDD_to_DDMMYYYY(project.endDate)}</p>
            <p class="project-description">${escapeHTML(project.description || 'Không có mô tả.')}</p>
            <div class="project-progress">
                Tiến độ: ${progress.toFixed(0)}% (${completedTasksCount} / ${projectTasks.length} công việc)
                <div class="project-progress-bar"><div class="project-progress-bar-fill" style="width: ${progress}%;"></div></div>
            </div>
            <div class="project-actions"><button class="btn-submit" style="background-color: var(--danger-color); flex-grow: 0.5;" onclick="event.stopPropagation(); deleteProject('${project.id}')">Xóa</button></div>
        `;
        projectListContainer.appendChild(projectCard);
    });
    renderProjectSettingsList();
}
function openProjectModal(projectId = null) {
    const modal = document.getElementById('project-modal');
    const titleEl = document.getElementById('project-modal-title');
    const idInput = document.getElementById('project-id');
    const nameInput = document.getElementById('project-name');
    const descriptionInput = document.getElementById('project-description');
    const startDateInput = document.getElementById('project-start-date');
    const endDateInput = document.getElementById('project-end-date');
    const deleteBtn = document.getElementById('delete-project-btn');
    const projectTasksList = document.getElementById('project-tasks-list');
    const addTaskToProjectSelect = document.getElementById('add-task-to-project-select');
    const addTaskToProjectBtn = document.getElementById('add-project-task-btn');
    projectTasksList.innerHTML = '';
    addTaskToProjectSelect.innerHTML = '<option value="">Chọn công việc để thêm...</option>';
    const unassignedTasks = tasks.filter(task => !task.projectId);
    unassignedTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = escapeHTML(task.name);
        addTaskToProjectSelect.appendChild(option);
    });
    addTaskToProjectBtn.replaceWith(addTaskToProjectBtn.cloneNode(true));
    const newAddTaskToProjectBtn = document.getElementById('add-project-task-btn');
    newAddTaskToProjectBtn.addEventListener('click', () => {
        const selectedTaskId = addTaskToProjectSelect.value;
        if (selectedTaskId && projectId) {
            assignTaskToProject(selectedTaskId, projectId);
        }
    });
    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        titleEl.textContent = 'Sửa dự án';
        idInput.value = project.id;
        nameInput.value = project.name;
        descriptionInput.value = project.description || '';
        startDateInput.value = project.startDate;
        endDateInput.value = project.endDate;
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = () => deleteProject(project.id);
        const currentProjectTasks = tasks.filter(task => task.projectId === projectId);
        currentProjectTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = task.status === settings.statuses[settings.statuses.length - 1] ? 'completed' : '';
            li.innerHTML = `<span>${escapeHTML(task.name)}</span><button style="background: none; border: none; color: var(--danger-color); cursor: pointer;" onclick="unassignTaskFromProject('${task.id}')">Xóa</button>`;
            projectTasksList.appendChild(li);
        });
    } else {
        titleEl.textContent = 'Thêm dự án mới';
        idInput.value = '';
        nameInput.value = '';
        descriptionInput.value = '';
        startDateInput.value = toLocalISOString(new Date());
        endDateInput.value = toLocalISOString(new Date(new Date().setDate(new Date().getDate() + 7)));
        deleteBtn.style.display = 'none';
    }
    modal.style.display = 'flex';
}
function closeProjectModal() { document.getElementById('project-modal').style.display = 'none'; }
async function saveProject() {
    const id = document.getElementById('project-id').value;
    const name = document.getElementById('project-name').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const startDate = document.getElementById('project-start-date').value;
    const endDate = document.getElementById('project-end-date').value;
    if (!name || !startDate || !endDate) { showNotification('Tên, ngày bắt đầu và ngày kết thúc không được để trống!', 'error'); return; }
    if (new Date(startDate) > new Date(endDate)) { showNotification('Ngày kết thúc phải sau ngày bắt đầu!', 'error'); return; }
    let projectData;
    if (id) {
        projectData = projects.find(p => p.id === id);
        if (!projectData) return;
    } else {
        projectData = { id: `proj_${crypto.randomUUID()}` };
    }
    projectData.name = name;
    projectData.description = description;
    projectData.startDate = startDate;
    projectData.endDate = endDate;
    if (!id) { projects.push(projectData); }
    await saveAllData();
    renderProjects();
    renderTasks();
    closeProjectModal();
    showNotification(id ? 'Cập nhật dự án thành công!' : 'Đã thêm dự án mới!', 'success');
}
async function deleteProject(id) {
    showConfirmModal('Bạn có chắc chắn muốn xóa dự án này? Tất cả công việc thuộc dự án này sẽ không còn liên kết.', async () => {
        projects = projects.filter(p => p.id !== id);
        tasks.forEach(task => { if (task.projectId === id) { task.projectId = ''; } });
        await saveAllData();
        renderProjects();
        renderTasks();
        closeProjectModal();
        showNotification('Đã xóa dự án.', 'success');
    });
}
async function assignTaskToProject(taskId, projectId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.projectId = projectId;
        await saveAllData();
        openProjectModal(projectId);
        renderTasks();
        showNotification('Đã thêm công việc vào dự án.', 'success');
    }
}
async function unassignTaskFromProject(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const currentProjectId = task.projectId;
    if (task) {
        task.projectId = '';
        await saveAllData();
        openProjectModal(currentProjectId);
        renderTasks();
        showNotification('Đã gỡ công việc khỏi dự án.', 'success');
    }
}
function mapRecurrenceType(type) {
    switch(type) {
        case 'daily': return 'Hàng ngày';
        case 'weekly': return 'Hàng tuần';
        case 'monthly': return 'Hàng tháng';
        default: return 'Không';
    }
}
function changeCalendarViewDate(direction) {
    if (currentCalendarView === 'week') { currentWeekDate.setDate(currentWeekDate.getDate() + 7 * direction); }
    else { currentMonthDate.setMonth(currentMonthDate.getMonth() + direction); }
    renderCalendar();
}
function toggleCalendarView(view) {
    currentCalendarView = view;
    document.getElementById('week-view-container').style.display = (view === 'week' ? 'block' : 'none');
    document.getElementById('month-view-container').style.display = (view === 'month' ? 'grid' : 'none');
    document.getElementById('view-week-btn').classList.toggle('active', view === 'week');
    document.getElementById('view-month-btn').classList.toggle('active', view === 'month');
    renderCalendar();
}
function renderCalendar() { if (currentCalendarView === 'week') { renderWeekCalendar(); } else { renderMonthCalendar(); } }
function renderWeekCalendar() {
    const calendarBody = document.getElementById('calendar-body');
    const calendarHeader = document.querySelector('.calendar-table thead tr');
    if (!calendarBody || !calendarHeader) return;
    calendarBody.innerHTML = '';
    calendarHeader.innerHTML = '<th class="time-col">Giờ</th>';
    const today = new Date();
    const firstDayOfWeek = getMonday(new Date(currentWeekDate));
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
    document.getElementById('current-view-range').textContent = `${formatDateToDDMMYYYY(firstDayOfWeek)} - ${formatDateToDDMMYYYY(lastDayOfWeek)}`;
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(firstDayOfWeek);
        day.setDate(day.getDate() + i);
        days.push(day);
        const th = document.createElement('th');
        th.innerHTML = `<div class="day-header-name">${day.toLocaleDateString('vi-VN', { weekday: 'long' })}</div><div class="day-header-date">${day.getDate()}</div>`;
        if (isSameDay(day, today)) th.style.color = 'var(--primary-orange)';
        calendarHeader.appendChild(th);
    }
    let allDayHtml = '<td class="time-col">Cả ngày</td>';
    days.forEach(day => {
        const dateStr = toLocalISOString(day);
        const dayTasks = tasks.filter(t => t.dueDate === dateStr);
        allDayHtml += `<td class="all-day-slot" data-date="${dateStr}">${dayTasks.map(t => `<div class="task-event" title="${escapeHTML(t.name)}" onclick="event.stopPropagation(); openEditModal('task', '${t.id}')">${escapeHTML(t.name)}</div>`).join('')}</td>`;
    });
    calendarBody.innerHTML = `<tr>${allDayHtml}</tr>`;
    for (let hour = 0; hour < 24; hour++) {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="time-col">${hour}:00</td>`;
        for (let i = 0; i < 7; i++) {
            const cell = document.createElement('td');
            cell.dataset.date = toLocalISOString(days[i]);
            cell.dataset.time = `${hour.toString().padStart(2, '0')}:00`;
            cell.onclick = () => openEventModal(cell.dataset.date, cell.dataset.time);
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
    }
    calendarEvents.forEach(event => {
        const eventDate = event.date;
        const eventStart = event.startTime;
        const eventEnd = event.endTime;
        const cell = document.querySelector(`#week-view-container td[data-date='${eventDate}'][data-time='${eventStart.substring(0,2)}:00']`);
        if (cell) {
            const startMinutes = parseInt(eventStart.split(':')[0]) * 60 + parseInt(eventStart.split(':')[1]);
            const endMinutes = parseInt(eventEnd.split(':')[0]) * 60 + parseInt(eventEnd.split(':')[1]);
            const duration = Math.max(30, endMinutes - startMinutes);
            const eventDiv = document.createElement('div');
            eventDiv.className = 'calendar-event';
            eventDiv.textContent = event.title;
            eventDiv.style.top = `${(startMinutes % 60) / 60 * 100}%`;
            eventDiv.style.height = `${duration / 60 * 100}%`;
            if(event.linkedTaskId) eventDiv.style.backgroundColor = 'var(--success-color)';
            eventDiv.onclick = (e) => { e.stopPropagation(); openEventModal(null, null, event.id); };
            cell.appendChild(eventDiv);
        }
    });
    updateCurrentTimeIndicator();
}
function renderMonthCalendar() {
    const monthGrid = document.getElementById('month-calendar-grid');
    if (!monthGrid) return;
    monthGrid.innerHTML = '';
    const today = new Date();
    const currentMonth = new Date(currentMonthDate);
    currentMonth.setDate(1);
    document.getElementById('current-view-range').textContent = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    const firstDayOfMonth = currentMonth.getDay();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const prevMonthLastDay = new Date(currentMonth);
    prevMonthLastDay.setDate(0);
    const daysInPrevMonth = prevMonthLastDay.getDate();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    dayNames.forEach(name => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'month-day-cell date-number';
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.borderBottom = '1px solid var(--border-color)';
        dayHeader.style.minHeight = 'auto';
        dayHeader.textContent = name;
        monthGrid.appendChild(dayHeader);
    });
    const startDayIndex = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
    for (let i = 0; i < startDayIndex; i++) {
        const cell = document.createElement('div');
        cell.className = 'month-day-cell inactive-month';
        cell.innerHTML = `<div class="date-number">${daysInPrevMonth - startDayIndex + i + 1}</div>`;
        monthGrid.appendChild(cell);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
        const dateStr = toLocalISOString(cellDate);
        const cell = document.createElement('div');
        cell.className = 'month-day-cell';
        cell.dataset.date = dateStr;
        cell.innerHTML = `<div class="date-number">${i}</div>`;
        if (isSameDay(cellDate, today)) { cell.classList.add('today'); }
        const dayEvents = calendarEvents.filter(e => e.date === dateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
        dayEvents.forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'month-day-event';
            eventDiv.textContent = `${event.startTime.substring(0,5)} ${event.title}`;
            eventDiv.title = event.title;
            eventDiv.onclick = (e) => { e.stopPropagation(); openEventModal(null, null, event.id); };
            cell.appendChild(eventDiv);
        });
        const dayTasks = tasks.filter(t => t.dueDate === dateStr && t.status !== settings.statuses[settings.statuses.length - 1]);
        dayTasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'month-day-task';
            taskDiv.textContent = task.name;
            taskDiv.title = task.name;
            taskDiv.onclick = (e) => { e.stopPropagation(); openEditModal('task', task.id); };
            cell.appendChild(taskDiv);
        });
        monthGrid.appendChild(cell);
    }
    const totalCells = monthGrid.children.length;
    const remainingCells = 7 * 6 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'month-day-cell inactive-month';
        cell.innerHTML = `<div class="date-number">${i}</div>`;
        monthGrid.appendChild(cell);
    }
    document.getElementById('current-time-indicator').style.display = 'none';
}
function updateCurrentTimeIndicator() {
    const indicator = document.getElementById('current-time-indicator');
    const calendarBody = document.getElementById('calendar-body');
    if (!indicator || !calendarBody || calendarBody.rows.length < 2 || currentCalendarView === 'month') { if(indicator) indicator.style.display = 'none'; return; }
    const now = new Date();
    const firstDayOfWeek = getMonday(new Date(currentWeekDate));
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 7);
    if (now >= firstDayOfWeek && now < lastDayOfWeek) {
        indicator.style.display = 'block';
        const allDayRow = calendarBody.rows[0];
        const timeCol = calendarBody.querySelector('.time-col');
        if (!allDayRow || !timeCol) { indicator.style.display = 'none'; return; }
        const minutesPastMidnight = now.getHours() * 60 + now.getMinutes();
        const hourRowHeight = calendarBody.rows.length > 1 ? calendarBody.rows[1].offsetHeight : 60; 
        const pixelsPerMinute = hourRowHeight / 60;
        const topOffset = allDayRow.offsetTop + allDayRow.offsetHeight + (minutesPastMidnight * pixelsPerMinute);
        indicator.style.top = `${topOffset}px`;
        indicator.style.left = `${timeCol.offsetWidth}px`;
        indicator.style.width = `calc(100% - ${timeCol.offsetWidth}px)`;
    } else {
        indicator.style.display = 'none';
    }
}
function openEventModal(date = null, time = null, eventId = null) {
    const modal = document.getElementById('event-modal');
    const title = document.getElementById('event-modal-title');
    const eventIdInput = document.getElementById('event-id');
    const titleInput = document.getElementById('event-title');
    const dateInput = document.getElementById('event-date');
    const startInput = document.getElementById('event-start-time');
    const endInput = document.getElementById('event-end-time');
    const taskLinkInput = document.getElementById('event-task-link');
    const deleteBtn = document.getElementById('delete-event-btn');
    taskLinkInput.innerHTML = '<option value="">Không có</option>' + tasks.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('');
    if (eventId) {
        const event = calendarEvents.find(e => e.id === eventId);
        title.textContent = 'Sửa sự kiện';
        eventIdInput.value = event.id;
        titleInput.value = event.title;
        dateInput.value = event.date;
        startInput.value = event.startTime;
        endInput.value = event.endTime;
        taskLinkInput.value = event.linkedTaskId || '';
        deleteBtn.style.display = 'inline-block';
    } else {
        title.textContent = 'Tạo sự kiện';
        eventIdInput.value = '';
        titleInput.value = '';
        dateInput.value = date || toLocalISOString(new Date());
        startInput.value = time || `${new Date().getHours().toString().padStart(2,'0')}:00`;
        const nextHour = (parseInt(startInput.value.split(':')[0]) + 1).toString().padStart(2, '0');
        endInput.value = `${nextHour}:00`;
        taskLinkInput.value = '';
        deleteBtn.style.display = 'none';
    }
    modal.style.display = 'flex';
}
function closeEventModal() { document.getElementById('event-modal').style.display = 'none'; }
async function saveCalendarEvent() {
    const id = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value.trim();
    if (!title) { showNotification('Tiêu đề không được để trống!', 'error'); return; }
    const eventData = { id: id || `event_${crypto.randomUUID()}`, title: title, date: document.getElementById('event-date').value, startTime: document.getElementById('event-start-time').value, endTime: document.getElementById('event-end-time').value, linkedTaskId: document.getElementById('event-task-link').value };
    if (id) {
        const index = calendarEvents.findIndex(e => e.id === id);
        calendarEvents[index] = eventData;
    } else {
        calendarEvents.push(eventData);
    }
    await saveAllData();
    renderCalendar();
    renderDashboard();
    renderStatistics();
    closeEventModal();
    scheduleNotifications();
}
async function deleteCalendarEvent() {
    const id = document.getElementById('event-id').value;
    showConfirmModal('Bạn có chắc muốn xóa sự kiện này?', async () => {
        calendarEvents = calendarEvents.filter(e => e.id !== id);
        await saveAllData();
        renderCalendar();
        renderDashboard();
        renderStatistics();
        closeEventModal();
        scheduleNotifications();
    });
}
function renderStudentJourney(){const e=document.getElementById("sv5t-board-container");e.innerHTML="";const t=document.createElement("div");t.className="sv5t-board";let n=!0;["khoa","truong","dhqg","thanhpho","trunguong"].forEach(o=>{const a=studentJourney.levels[o],d=!n,i=document.createElement("div");i.className=`sv5t-column ${d?"locked":""}`,i.innerHTML=`<div class="sv5t-column-header">${d?'<span class="lock-icon">🔒</span>':""} ${escapeHTML(a.name)}</div><div class="sv5t-column-content"></div>`;const s=i.querySelector(".sv5t-column-content");Object.keys(a.criteria).forEach(t=>{const n=a.criteria[t],d=sv5tCriteriaData[o].criteria[t],l=checkCriterionStatus(o,t),r=n.conditions.length,c=n.conditions.filter(e=>e.completed).length,m=r>0?c/r*100:0,u=document.createElement("div");u.className=`sv5t-card ${l?"achieved":""}`,u.innerHTML=`<div class="sv5t-card-header"><span class="sv5t-card-icon">${d.icon}</span><span>${escapeHTML(d.name)}</span></div><div class="sv5t-card-progress-info"><span>${c} / ${r} điều kiện</span></div><div class="sv5t-progress-bar"><div class="sv5t-progress-bar-fill" style="width: ${m}%;"></div></div>`,i.classList.contains("locked")?u.style.cursor="not-allowed":u.onclick=()=>openSidePanel(o,t),s.appendChild(u)}),t.appendChild(i),n="Đủ điều kiện"===a.status}),e.appendChild(t)}
function openSidePanel(e,t){editingContext={levelId:e,criteriaId:t};const n=sv5tCriteriaData[e].criteria[t],o=document.getElementById("sv5t-side-panel"),a=document.getElementById("sv5t-panel-overlay"),d=document.getElementById("sv5t-panel-title"),i=document.getElementById("sv5t-panel-body");d.innerHTML=`${n.icon} ${escapeHTML(n.name)} <small style="display:block; color: var(--text-color-secondary); font-weight: normal;">(${escapeHTML(studentJourney.levels[e].name)})</small>`,i.innerHTML='<div class="condition-list" id="condition-list-container"></div>',renderConditionsInPanel(e,t),o.classList.add("open"),a.classList.add("active")}function closeSidePanel(){document.getElementById("sv5t-side-panel").classList.remove("open"),document.getElementById("sv5t-panel-overlay").classList.remove("active"),editingContext={}}
function renderConditionsInPanel(levelId, criteriaId) {
    const container = document.getElementById('condition-list-container');
    if (!container) return;
    const conditions = studentJourney.levels[levelId].criteria[criteriaId].conditions || [];
    const criterionTemplate = sv5tCriteriaData[levelId].criteria[criteriaId];
    const fragment = document.createDocumentFragment();
    const requiredConditions = conditions.filter(c => c.type === 'required');
    if (requiredConditions.length > 0) {
        requiredConditions.forEach(cond => fragment.appendChild(createConditionItem(cond)));
    }
    if (criterionTemplate.optionalGroups) {
        criterionTemplate.optionalGroups.forEach((group, groupIndex) => {
            const header = document.createElement('h4');
            header.className = 'optional-group-header';
            header.textContent = escapeHTML(group.description);
            fragment.appendChild(header);
            const optionalConditions = conditions.filter(c => c.optionalGroupId === `${criteriaId}_${groupIndex}`);
            optionalConditions.forEach(cond => fragment.appendChild(createConditionItem(cond)));
        });
    }
    container.innerHTML = '';
    if (fragment.hasChildNodes()) { container.appendChild(fragment); }
    else { container.innerHTML = `<p style="color: var(--text-color-secondary);">Chưa có điều kiện nào được định nghĩa.</p>`; }
}
function createConditionItem(condition) {
    const li = document.createElement('li');
    li.className = `condition-item ${condition.completed ? 'completed' : ''}`;
    li.dataset.id = condition.id;
    li.innerHTML = `
        <div class="condition-main">
            <input type="checkbox" ${condition.completed ? 'checked' : ''} style="width: 20px; height: 20px; flex-shrink: 0;">
            <span class="condition-name">${escapeHTML(condition.text)}</span>
            <span class="condition-type-badge ${condition.type}">${condition.type === 'required' ? 'Bắt buộc' : 'Tự chọn'}</span>
        </div>
        <div class="proof-area">
            <button class="btn-submit" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;"><span class="btn-text">📁 Tải minh chứng</span><div class="btn-spinner"></div></button>
            <ul class="proof-list">${(condition.proofs || []).map(proof => `<li class="proof-item"><div class="proof-info"><span class="icon">${getFileIcon(proof.type)}</span><a href="#" data-proof-id="${proof.id}">${escapeHTML(proof.name)}</a></div><div class="proof-actions"><button data-condition-id="${condition.id}" data-proof-id="${proof.id}">🗑️</button></div></li>`).join('')}</ul>
        </div>
    `;
    const main = li.querySelector('.condition-main');
    const checkbox = li.querySelector('input[type="checkbox"]');
    const proofArea = li.querySelector('.proof-area');
    main.addEventListener('click', (e) => { if (e.target !== checkbox) { proofArea.classList.toggle('open'); } });
    checkbox.addEventListener('change', (e) => { toggleCondition(condition.id, e.target); });
    li.querySelector('.btn-submit').addEventListener('click', () => triggerProofUpload(condition.id));
    li.querySelectorAll('.proof-list a').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); viewProof(e.target.dataset.proofId); }));
    li.querySelectorAll('.proof-actions button').forEach(b => b.addEventListener('click', (e) => { deleteProofGlobally(e.target.dataset.conditionId, e.target.dataset.proofId); }));
    return li;
}
async function toggleCondition(conditionId, checkboxElement) {
    const { levelId, criteriaId } = editingContext;
    const condition = studentJourney.levels[levelId].criteria[criteriaId].conditions.find(c => c.id === conditionId);
    if(condition) {
        condition.completed = !condition.completed;
        if (condition.completed && typeof confetti === 'function') {
            const rect = checkboxElement.getBoundingClientRect();
            confetti({ particleCount: 100, spread: 70, origin: { x: (rect.left + rect.right) / 2 / window.innerWidth, y: (rect.top + rect.bottom) / 2 / window.innerHeight } });
        }
        const item = checkboxElement.closest('.condition-item');
        if(item) { item.classList.toggle('completed', condition.completed); }
        await updateLevelStatus();
        renderDashboard();
        renderStatistics();
    }
}
function triggerProofUpload(e){const{levelId:t,criteriaId:n}=editingContext;currentUploadingContext={levelId:t,criteriaId:n,conditionId:e},document.getElementById("proof-upload-input").click()}async function handleProofUpload(e){const t=e.target.files[0];if(!t||!currentUploadingContext)return;const{levelId:n,criteriaId:o,conditionId:a}=currentUploadingContext,d=document.querySelector(`.condition-item[data-id="${a}"] .btn-submit`);try{d&&d.classList.add("loading");const e=`proof_${crypto.randomUUID()}`;await dbSet("files",{id:e,file:t});const i=studentJourney.levels[n].criteria[o].conditions.find(e=>e.id===a);i.proofs||(i.proofs=[]),i.proofs.push({id:e,name:t.name,type:t.type,size:t.size}),await saveAllData(),renderConditionsInPanel(n,o),showNotification("Đã tải lên minh chứng!","success")}catch(e){console.error(e),showNotification("Tải minh chứng thất bại!","error")}finally{d&&d.classList.remove("loading"),currentUploadingContext=null,e.target.value=""}}async function viewProof(e){try{const t=await dbGet("files",e);t&&t.file?window.open(URL.createObjectURL(t.file),"_blank"):showNotification("Không tìm thấy tệp.","error")}catch(e){showNotification("Không thể mở tệp.","error")}}
function checkCriterionStatus(levelId, criteriaId) {
    const criterion = studentJourney.levels[levelId].criteria[criteriaId];
    const criterionTemplate = sv5tCriteriaData[levelId].criteria[criteriaId];
    const requiredMet = (criterionTemplate.required || []).every(req => {
        const cond = criterion.conditions.find(c => c.id === req.id);
        return cond && cond.completed;
    });
    if (!requiredMet) return false;
    if (criterionTemplate.optionalGroups) {
        for (let i = 0; i < criterionTemplate.optionalGroups.length; i++) {
            const groupId = `${criteriaId}_${i}`;
            const hasCompletedInGroup = criterion.conditions.some(c => c.optionalGroupId === groupId && c.completed);
            if (!hasCompletedInGroup) return false;
        }
    }
    return true;
}
async function updateLevelStatus(shouldSave = true) {
    let lowerLevelAchieved = true;
    for (const levelId of ['khoa', 'truong', 'dhqg', 'thanhpho', 'trunguong']) {
        const level = studentJourney.levels[levelId];
        let currentLevelSufficient = Object.keys(level.criteria).every(criteriaId => checkCriterionStatus(levelId, criteriaId));
        level.status = (lowerLevelAchieved && currentLevelSufficient) ? 'Đủ điều kiện' : 'Chưa đủ điều kiện';
        lowerLevelAchieved = level.status === 'Đủ điều kiện';
    }
    if (shouldSave) await saveAllData();
    renderStudentJourney();
    renderDashboard();
    renderStatistics();
}
function getAllProofs(){const e=[];for(const t in studentJourney.levels)for(const n in studentJourney.levels[t].criteria){const o=studentJourney.levels[t].criteria[n];for(const a of o.conditions)a.proofs&&a.proofs.length>0&&a.proofs.forEach(o=>{e.push({...o,conditionId:a.id,conditionText:a.text})})}return e}
function renderProofsManagement() {
    const proofs = getAllProofs();
    const tbody = document.getElementById('proof-list-body');
    const searchInput = document.getElementById('proof-search').value.toLowerCase();
    tbody.innerHTML = '';
    if (proofs.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-color-secondary);">Chưa có minh chứng nào được tải lên.</td></tr>`; return; }
    const fragment = document.createDocumentFragment();
    proofs.filter(proof => proof.name.toLowerCase().includes(searchInput)).forEach(proof => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHTML(proof.name)}</td><td>${escapeHTML(proof.conditionText)}</td><td>${formatBytes(proof.size)}</td><td><button class="btn-submit btn-action" style="background-color: var(--primary-blue);">Xem</button><button class="btn-submit btn-action" style="background-color: var(--danger-color);">Xóa</button></td>`;
        tr.querySelector('.btn-action[style*="--primary-blue"]').addEventListener('click', () => viewProof(proof.id));
        tr.querySelector('.btn-action[style*="--danger-color"]').addEventListener('click', () => deleteProofGlobally(proof.conditionId, proof.id));
        fragment.appendChild(tr);
    });
    if (!fragment.hasChildNodes()) { tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-color-secondary);">Không tìm thấy minh chứng phù hợp.</td></tr>`; }
    else { tbody.appendChild(fragment); }
}
async function deleteProofGlobally(conditionId, proofId) {
    showConfirmModal('Bạn có chắc chắn muốn xóa minh chứng này vĩnh viễn?', async () => {
        let foundAndDeleted = false;
        for (const levelId in studentJourney.levels) {
            for (const criteriaId in studentJourney.levels[levelId].criteria) {
                const criterion = studentJourney.levels[levelId].criteria[criteriaId];
                const condition = criterion.conditions.find(c => c.id === conditionId);
                if (condition) {
                    const initialLength = condition.proofs.length;
                    condition.proofs = condition.proofs.filter(p => p.id !== proofId);
                    if (condition.proofs.length < initialLength) {
                        await dbDelete('files', proofId);
                        foundAndDeleted = true;
                        break; 
                    }
                }
            }
            if (foundAndDeleted) break;
        }
        if (foundAndDeleted) {
            await saveAllData();
            renderProofsManagement();
            if (editingContext.levelId && editingContext.criteriaId && editingContext.conditionId === conditionId) {
                renderConditionsInPanel(editingContext.levelId, editingContext.criteriaId);
            }
            showNotification('Đã xóa minh chứng.', 'success');
        } else {
            showNotification('Không tìm thấy minh chứng để xóa.', 'error');
        }
    });
}
function openAchievementModal(id = null) {
    const modal = document.getElementById('achievement-modal');
    const titleEl = document.getElementById('achievement-modal-title');
    const idInput = document.getElementById('achievement-id');
    const nameInput = document.getElementById('achievement-title');
    const dateInput = document.getElementById('achievement-date');
    const descriptionInput = document.getElementById('achievement-description');
    const fileNameEl = document.getElementById('achievement-file-name');
    const deleteBtn = document.getElementById('delete-achievement-btn');
    currentAchievementFile = null;
    if (id) {
        const achievement = achievements.find(a => a.id === id);
        if (achievement) {
            titleEl.textContent = 'Sửa thành tích';
            idInput.value = achievement.id;
            nameInput.value = achievement.name;
            dateInput.value = achievement.date;
            descriptionInput.value = achievement.description || '';
            fileNameEl.textContent = achievement.fileName || 'Chưa có tệp';
            deleteBtn.style.display = 'inline-block';
            deleteBtn.onclick = () => deleteAchievement(id);
        }
    } else {
        titleEl.textContent = 'Thêm thành tích';
        idInput.value = '';
        nameInput.value = '';
        dateInput.value = toLocalISOString(new Date());
        descriptionInput.value = '';
        fileNameEl.textContent = '';
        deleteBtn.style.display = 'none';
    }
    modal.style.display = 'flex';
}
function closeAchievementModal() { document.getElementById('achievement-modal').style.display = 'none'; currentAchievementFile = null; }
async function saveAchievement() {
    const id = document.getElementById('achievement-id').value;
    const name = document.getElementById('achievement-title').value.trim();
    const date = document.getElementById('achievement-date').value;
    const description = document.getElementById('achievement-description').value.trim();
    if (!name || !date) { showNotification('Tên thành tích và ngày cấp không được để trống!', 'error'); return; }
    let achievementData;
    if (id) { achievementData = achievements.find(a => a.id === id); if (!achievementData) return; }
    else { achievementData = { id: `ach_${crypto.randomUUID()}` }; }
    achievementData.name = name;
    achievementData.date = date;
    achievementData.description = description;
    if (currentAchievementFile) {
        if (achievementData.fileId) { await dbDelete('files', achievementData.fileId); }
        const fileId = `file_${crypto.randomUUID()}`;
        await dbSet('files', { id: fileId, file: currentAchievementFile });
        achievementData.fileId = fileId;
        achievementData.fileName = currentAchievementFile.name;
        achievementData.fileType = currentAchievementFile.type;
    }
    if (!id) { achievements.push(achievementData); }
    await saveAllData();
    renderAchievements();
    renderDashboard();
    closeAchievementModal();
    showNotification(id ? 'Cập nhật thành tích thành công!' : 'Đã thêm thành tích mới!', 'success');
}
function deleteAchievement(id) {
    showConfirmModal('Bạn có chắc chắn muốn xóa thành tích này?', async () => {
        const achievementIndex = achievements.findIndex(a => a.id === id);
        if (achievementIndex > -1) {
            const achievement = achievements[achievementIndex];
            if (achievement.fileId) { await dbDelete('files', achievement.fileId); }
            achievements.splice(achievementIndex, 1);
            await saveAllData();
            renderAchievements();
            renderDashboard();
            closeAchievementModal();
            showNotification('Đã xóa thành tích.', 'success');
        }
    });
}
async function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    achievements.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (achievements.length === 0) { grid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary); grid-column: 1 / -1; padding: 2rem 0;">Chưa có thành tích nào. Hãy nhấn "Thêm Mới" để bắt đầu!</p>'; return; }
    grid.innerHTML = ''; 
    for (const achievement of achievements) {
        const card = document.createElement('div');
        card.className = 'achievement-card';
        card.onclick = (e) => { if (e.target.tagName !== 'BUTTON') { openAchievementModal(achievement.id); } };
        let previewHTML = '<div class="achievement-preview"><span>🏆</span></div>';
        if (achievement.fileId) {
            const fileData = await dbGet('files', achievement.fileId);
            if (fileData && fileData.file) {
                try {
                    if (fileData.file.type.startsWith('image/')) {
                        const url = URL.createObjectURL(fileData.file);
                        previewHTML = `<div class="achievement-preview"><img src="${url}" alt="${escapeHTML(achievement.name)}" onload="URL.revokeObjectURL(this.src)"></div>`;
                    } else {
                        previewHTML = `<div class="achievement-preview"><span>${getFileIcon(fileData.file.type)}</span></div>`;
                    }
                } catch (e) { console.error("Error creating object URL for file:", fileData.file.name); }
            }
        }
        card.innerHTML = `${previewHTML}<div class="achievement-info"><h3>${escapeHTML(achievement.name)}</h3><p>Ngày cấp: ${formatYYYYMMDD_to_DDMMYYYY(achievement.date)}</p><div class="achievement-actions"><button class="btn-submit" style="background-color: var(--primary-blue);" onclick="event.stopPropagation(); viewProof('${achievement.fileId}')" ${!achievement.fileId ? 'disabled' : ''}>Xem</button><button class="btn-submit" style="background-color: var(--danger-color);" onclick="event.stopPropagation(); deleteAchievement('${achievement.id}')">Xóa</button></div></div>`;
        grid.appendChild(card);
    }
}
function handleAchievementFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        currentAchievementFile = file;
        document.getElementById('achievement-file-name').textContent = `Tệp đã chọn: ${file.name}`;
    }
}

// --- DASHBOARD, FOCUS, STATISTICS ---
function renderDashboard() {
    const todayStr = toLocalISOString(new Date());
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const todayTasks = tasks.filter(task => task.dueDate === todayStr && task.status !== settings.statuses[settings.statuses.length - 1]);
    const todayTasksList = document.getElementById('dashboard-today-tasks');
    const todayTasksEmpty = document.getElementById('dashboard-today-tasks-empty');
    if(todayTasksList) {
        todayTasksList.innerHTML = '';
        if (todayTasks.length > 0) {
            todayTasks.forEach(task => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="task-title">${escapeHTML(task.name)}</span><span class="due-date">Hạn: ${formatYYYYMMDD_to_DDMMYYYY(task.dueDate)}</span>`;
                todayTasksList.appendChild(li);
            });
            todayTasksEmpty.style.display = 'none';
        } else {
            todayTasksEmpty.style.display = 'block';
        }
    }
    const upcomingEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0,0,0,0);
        return eventDate >= new Date(todayStr) && eventDate <= next7Days;
    }).sort((a,b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));
    const upcomingEventsList = document.getElementById('dashboard-upcoming-events');
    const upcomingEventsEmpty = document.getElementById('dashboard-upcoming-events-empty');
    if(upcomingEventsList) {
        upcomingEventsList.innerHTML = '';
        if (upcomingEvents.length > 0) {
            upcomingEvents.forEach(event => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="event-title">${escapeHTML(event.title)}</span><span class="event-time">${formatYYYYMMDD_to_DDMMYYYY(event.date)} lúc ${event.startTime}</span>`;
                upcomingEventsList.appendChild(li);
            });
            upcomingEventsEmpty.style.display = 'none';
        } else {
            upcomingEventsEmpty.style.display = 'block';
        }
    }
    const recentAchievements = achievements.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const recentAchievementsList = document.getElementById('dashboard-recent-achievements');
    const recentAchievementsEmpty = document.getElementById('dashboard-recent-achievements-empty');
    if(recentAchievementsList) {
        recentAchievementsList.innerHTML = '';
        if (recentAchievements.length > 0) {
            recentAchievements.forEach(ach => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="achievement-title">${escapeHTML(ach.name)}</span><span class="achievement-date">${formatYYYYMMDD_to_DDMMYYYY(ach.date)}</span>`;
                recentAchievementsList.appendChild(li);
            });
            recentAchievementsEmpty.style.display = 'none';
        } else {
            recentAchievementsEmpty.style.display = 'block';
        }
    }
}
function renderFocusMode() {
    updatePomodoroDisplay();
    document.getElementById('pomodoro-start-btn').style.display = isPomodoroRunning ? 'none' : 'inline-block';
    document.getElementById('pomodoro-pause-btn').style.display = isPomodoroRunning ? 'inline-block' : 'none';
    document.getElementById('focus-duration').value = focusDuration / 60;
    document.getElementById('break-duration').value = breakDuration / 60;
}
function updatePomodoroDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('pomodoro-timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function startPomodoro() {
    if (isPomodoroRunning) return;
    isPomodoroRunning = true;
    document.getElementById('pomodoro-start-btn').style.display = 'none';
    document.getElementById('pomodoro-pause-btn').style.display = 'inline-block';
    pomodoroTimer = setInterval(() => {
        timeLeft--;
        updatePomodoroDisplay();
        if (timeLeft <= 0) {
            clearInterval(pomodoroTimer);
            isPomodoroRunning = false;
            document.getElementById('pomodoro-start-btn').style.display = 'inline-block';
            document.getElementById('pomodoro-pause-btn').style.display = 'none';
            if (!isBreak) {
                showNotification('Hoàn thành phiên làm việc!', 'success');
                if (settings.notificationsEnabled && Notification.permission === 'granted') { new Notification('Hoàn thành phiên làm việc!', { body: 'Đã đến giờ nghỉ ngơi.' }); }
                isBreak = true;
                timeLeft = breakDuration;
            } else {
                showNotification('Kết thúc giờ nghỉ!', 'info');
                if (settings.notificationsEnabled && Notification.permission === 'granted') { new Notification('Kết thúc giờ nghỉ!', { body: 'Đã đến lúc trở lại làm việc!' }); }
                isBreak = false;
                timeLeft = focusDuration;
            }
            updatePomodoroDisplay();
        }
    }, 1000);
}
function pausePomodoro() { clearInterval(pomodoroTimer); isPomodoroRunning = false; document.getElementById('pomodoro-start-btn').style.display = 'inline-block'; document.getElementById('pomodoro-pause-btn').style.display = 'none'; }
function resetPomodoro() { clearInterval(pomodoroTimer); isPomodoroRunning = false; isBreak = false; timeLeft = focusDuration; updatePomodoroDisplay(); document.getElementById('pomodoro-start-btn').style.display = 'inline-block'; document.getElementById('pomodoro-pause-btn').style.display = 'none'; }
function updatePomodoroSettings() {
    const newFocusDuration = parseInt(document.getElementById('focus-duration').value) * 60;
    const newBreakDuration = parseInt(document.getElementById('break-duration').value) * 60;
    if (isNaN(newFocusDuration) || newFocusDuration <= 0 || isNaN(newBreakDuration) || newBreakDuration <= 0) { showNotification('Thời gian làm việc và nghỉ phải là số dương!', 'error'); return; }
    focusDuration = newFocusDuration;
    breakDuration = newBreakDuration;
    if (!isPomodoroRunning) { timeLeft = focusDuration; updatePomodoroDisplay(); }
    showNotification('Đã cập nhật cài đặt Pomodoro!', 'success');
}
function renderStatistics() {
    const completedTasks = tasks.filter(t => t.status === settings.statuses[settings.statuses.length - 1]).length;
    const totalEvents = calendarEvents.length;
    document.getElementById('stat-tasks-completed').textContent = completedTasks;
    document.getElementById('stat-total-events').textContent = totalEvents;
    const taskCompletionChart = document.getElementById('task-completion-chart');
    const taskCompletionLegend = document.getElementById('task-completion-legend');
    if (!taskCompletionChart || !taskCompletionLegend) return;
    taskCompletionChart.innerHTML = '';
    taskCompletionLegend.innerHTML = '';
    if (tasks.length === 0) {
        taskCompletionChart.innerHTML = '<p style="color: var(--text-color-secondary); padding: 0.5rem;">Không có dữ liệu công việc.</p>';
    } else {
        const statusCounts = {};
        tasks.forEach(task => { statusCounts[task.status] = (statusCounts[task.status] || 0) + 1; });
        const totalTasks = tasks.length;
        const statusColors = { 'Chưa thực hiện': '#6c757d', 'Đang thực hiện': '#ffc107', 'Đã hoàn thành': '#28a745' };
        settings.statuses.forEach(status => { if (!(status in statusCounts)) { statusCounts[status] = 0; } });
        const sortedStatuses = [...settings.statuses];
        sortedStatuses.forEach(status => {
            const count = statusCounts[status] || 0;
            const percentage = (count / totalTasks) * 100;
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = statusColors[status] || stringToHslColor(status);
            segment.title = `${escapeHTML(status)}: ${count} (${percentage.toFixed(1)}%)`;
            if (percentage > 5) { segment.textContent = `${percentage.toFixed(0)}%`; }
            taskCompletionChart.appendChild(segment);
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `<div class="legend-color" style="background-color: ${statusColors[status] || stringToHslColor(status)};"></div><span>${escapeHTML(status)} (${count})</span>`;
            taskCompletionLegend.appendChild(legendItem);
        });
    }
    const taskCategoryChart = document.getElementById('task-category-chart');
    if (!taskCategoryChart) return;
    taskCategoryChart.innerHTML = '';
    if (tasks.length === 0) {
        taskCategoryChart.innerHTML = '<p style="color: var(--text-color-secondary); padding: 0.5rem;">Không có dữ liệu công việc để phân loại.</p>';
    } else {
        const categoryCounts = {};
        tasks.forEach(task => { categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1; });
        const totalTasks = tasks.length;
        const sortedCategories = Object.keys(categoryCounts).sort((a,b) => categoryCounts[b] - categoryCounts[a]);
        sortedCategories.forEach(category => {
            const count = categoryCounts[category];
            const percentage = (count / totalTasks) * 100;
            const barItem = document.createElement('div');
            barItem.className = 'category-bar-item';
            barItem.innerHTML = `<span class="category-bar-label">${escapeHTML(category)}</span><div class="category-bar-outer"><div class="category-bar-fill" style="width: ${percentage}%; background-color: ${stringToHslColor(category)};">${percentage > 5 ? `${percentage.toFixed(0)}%` : ''}</div></div>`;
            taskCategoryChart.appendChild(barItem);
        });
    }
}

// --- DIGITAL LIBRARY & OUTLINE COMPOSER ---
function renderDigitalLibrary() {
    const grid = document.getElementById('library-grid');
    const emptyState = document.getElementById('library-empty');
    if (!grid || !emptyState) return;
    const searchTerm = document.getElementById('library-search').value.toLowerCase();
    const sortBy = document.getElementById('library-sort').value;
    let processedDocs = documents.filter(doc => {
        const searchIn = `${doc.title} ${doc.tags.join(' ')}`.toLowerCase();
        return searchIn.includes(searchTerm);
    });
    processedDocs.sort((a, b) => {
        switch (sortBy) {
            case 'date-asc': return new Date(a.dateAdded) - new Date(b.dateAdded);
            case 'title-asc': return a.title.localeCompare(b.title);
            case 'date-desc': default: return new Date(b.dateAdded) - new Date(a.dateAdded);
        }
    });
    grid.innerHTML = '';
    if (processedDocs.length === 0) { emptyState.style.display = 'block'; return; }
    emptyState.style.display = 'none';
    processedDocs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.style.borderColor = stringToHslColor(doc.type, 50, 60);
        const tagsHtml = doc.tags.map(tag => `<span class="tag-badge">${escapeHTML(tag)}</span>`).join('');
        card.innerHTML = `
            <div class="doc-card-header"><span class="doc-card-icon">${getDocumentTypeIcon(doc.type)}</span><div><h3 class="doc-card-title">${escapeHTML(doc.title)}</h3><p class="doc-card-type">${getDocumentTypeName(doc.type)}</p></div></div>
            <div class="doc-card-body"><div><span>Nguồn:</span> <a href="${doc.source}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${escapeHTML(doc.source) || 'Không có'}</a></div><div class="doc-card-tags">${tagsHtml}</div></div>
            <div class="doc-card-footer"><span>Ngày thêm: ${formatISOToVietnamese(doc.dateAdded)}</span><div class="doc-card-actions"><button class="btn-submit" onclick="event.stopPropagation(); openDocumentViewer('${doc.id}')">Xem</button><button class="btn-submit" style="background-color: var(--warning-color);" onclick="event.stopPropagation(); openDocumentModal('${doc.id}')">Sửa</button></div></div>`;
        grid.appendChild(card);
    });
}
function renderOutlineComposer() {
    renderOutlineList();
    if (currentlySelectedOutlineId) {
        renderOutlineEditor(currentlySelectedOutlineId);
    } else {
        document.getElementById('outline-editor-welcome').style.display = 'flex';
        document.getElementById('outline-editor-content').style.display = 'none';
    }
}
function renderOutlineList() {
    const container = document.getElementById('outline-list-container');
    const searchTerm = document.getElementById('outline-search').value.toLowerCase();
    if (!container) return;

    const filteredOutlines = outlines.filter(o => o.title.toLowerCase().includes(searchTerm));

    if (filteredOutlines.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary); padding: 1rem;">Chưa có dàn ý nào.</p>';
        return;
    }

    container.innerHTML = filteredOutlines.map(outline => `
        <div class="outline-list-item ${outline.id === currentlySelectedOutlineId ? 'active' : ''}" onclick="selectOutline('${outline.id}')">
            ${escapeHTML(outline.title)}
            <button class="delete-outline-btn" onclick="event.stopPropagation(); deleteOutline('${outline.id}')">×</button>
        </div>
    `).join('');
}
function selectOutline(id) {
    currentlySelectedOutlineId = id;
    renderOutlineList();
    renderOutlineEditor(id);
}
function renderOutlineEditor(id) {
    const outline = outlines.find(o => o.id === id);
    if (!outline) {
        currentlySelectedOutlineId = null;
        renderOutlineComposer();
        return;
    }

    document.getElementById('outline-editor-welcome').style.display = 'none';
    document.getElementById('outline-editor-content').style.display = 'block';
    document.getElementById('editor-outline-title').textContent = outline.title;

    const treeContainer = document.getElementById('outline-tree-container');
    treeContainer.innerHTML = '';
    
    if (outline.nodes && outline.nodes.length > 0) {
        const treeElement = buildNodeTree(outline.nodes, []);
        treeContainer.appendChild(treeElement);
    }
}
function buildNodeTree(nodes, prefixParts) {
    const ul = document.createElement('ul');
    ul.className = 'outline-node-children';
    if (prefixParts.length === 0) {
        ul.style.paddingLeft = '0';
        ul.style.borderLeft = 'none';
    }

    nodes.forEach((node, index) => {
        const currentPrefixParts = [...prefixParts, index + 1];
        const li = document.createElement('li');
        li.className = 'outline-node';
        li.dataset.nodeId = node.id;

        const nodeContent = document.createElement('div');
        nodeContent.className = 'outline-node-content';
        
        const statusColor = {
            'Chưa bắt đầu': 'var(--dark-gray)',
            'Đang thực hiện': 'var(--warning-color)',
            'Hoàn thành': 'var(--success-color)'
        }[node.status] || 'var(--dark-gray)';

        nodeContent.innerHTML = `
            <span class="node-title">
                <span class="node-prefix">${currentPrefixParts.join('.')}.</span>
                ${escapeHTML(node.title)}
            </span>
            <span class="node-status-badge" style="background-color: ${statusColor};">${escapeHTML(node.status)}</span>
            <div class="node-actions">
                <button title="Thêm mục con" onclick="addNodeToOutline('${node.id}')">+</button>
                <button title="Sửa mục" onclick="openNodePanel('${node.id}')">✎</button>
                <button title="Xóa mục" onclick="deleteNode('${node.id}')">🗑</button>
            </div>
        `;
        li.appendChild(nodeContent);

        if (node.children && node.children.length > 0) {
            li.appendChild(buildNodeTree(node.children, currentPrefixParts));
        }
        ul.appendChild(li);
    });
    return ul;
}
function openOutlineModal(id = null) {
    const modal = document.getElementById('outline-modal');
    const titleEl = document.getElementById('outline-modal-title');
    const idInput = document.getElementById('outline-id');
    const titleInput = document.getElementById('outline-title');
    
    if (id) {
        const outline = outlines.find(o => o.id === id);
        if(outline) {
            titleEl.textContent = 'Sửa tên Dàn ý';
            idInput.value = outline.id;
            titleInput.value = outline.title;
        }
    } else {
        titleEl.textContent = 'Tạo Dàn ý Mới';
        idInput.value = '';
        titleInput.value = '';
    }
    modal.style.display = 'flex';
}
function closeOutlineModal() { document.getElementById('outline-modal').style.display = 'none'; }
async function saveOutline() {
    const id = document.getElementById('outline-id').value;
    const title = document.getElementById('outline-title').value.trim();
    if (!title) {
        showNotification('Tên dàn ý không được để trống!', 'error');
        return;
    }

    if (id) {
        const outline = outlines.find(o => o.id === id);
        if(outline) outline.title = title;
    } else {
        const newOutline = {
            id: `outline_${crypto.randomUUID()}`,
            title: title,
            nodes: []
        };
        outlines.push(newOutline);
        currentlySelectedOutlineId = newOutline.id;
    }
    await saveAllData();
    renderOutlineComposer();
    closeOutlineModal();
}
function deleteOutline(id) {
    showConfirmModal('Bạn có chắc muốn xóa vĩnh viễn dàn ý này?', async () => {
        outlines = outlines.filter(o => o.id !== id);
        if (currentlySelectedOutlineId === id) {
            currentlySelectedOutlineId = null;
        }
        await saveAllData();
        renderOutlineComposer();
        showNotification('Đã xóa dàn ý.', 'success');
    });
}
function findNode(nodes, nodeId) {
    for (const node of nodes) {
        if (node.id === nodeId) return { node, parent: nodes };
        if (node.children) {
            const found = findNode(node.children, nodeId);
            if (found) return found;
        }
    }
    return null;
}
function addNodeToOutline(parentId = null) {
    const title = prompt("Nhập tên mục mới:", "Mục mới");
    if (!title) return;

    const newNode = {
        id: `node_${crypto.randomUUID()}`,
        title: title,
        status: 'Chưa bắt đầu',
        notes: '',
        attachedDocs: [],
        children: []
    };

    const outline = outlines.find(o => o.id === currentlySelectedOutlineId);
    if (!outline) return;

    if (parentId) {
        const parent = findNode(outline.nodes, parentId)?.node;
        if (parent) {
            parent.children.push(newNode);
        }
    } else {
        outline.nodes.push(newNode);
    }
    saveAllData();
    renderOutlineEditor(currentlySelectedOutlineId);
}
function deleteNode(nodeId) {
    showConfirmModal('Bạn có chắc muốn xóa mục này và tất cả các mục con của nó?', () => {
        const outline = outlines.find(o => o.id === currentlySelectedOutlineId);
        if (!outline) return;

        function removeNode(nodes) {
            const index = nodes.findIndex(n => n.id === nodeId);
            if (index > -1) {
                nodes.splice(index, 1);
                return true;
            }
            for (const node of nodes) {
                if (node.children && removeNode(node.children)) {
                    return true;
                }
            }
            return false;
        }

        if(removeNode(outline.nodes)) {
            saveAllData();
            renderOutlineEditor(currentlySelectedOutlineId);
            showNotification('Đã xóa mục.', 'success');
        }
    });
}
function openNodePanel(nodeId) {
    editingItemId = nodeId;
    const outline = outlines.find(o => o.id === currentlySelectedOutlineId);
    if (!outline) return;
    
    const { node } = findNode(outline.nodes, nodeId);
    if (!node) return;

    const panel = document.getElementById('outline-node-side-panel');
    const overlay = document.getElementById('outline-node-panel-overlay');
    const body = document.getElementById('outline-node-panel-body');

    const availableDocs = documents.map(doc => `<option value="${doc.id}">${escapeHTML(doc.title)}</option>`).join('');
    
    body.innerHTML = `
        <div class="form-group">
            <label>Tên mục</label>
            <input type="text" id="edit-node-title" value="${escapeHTML(node.title)}">
        </div>
        <div class="form-group">
            <label>Trạng thái</label>
            <select id="edit-node-status">
                <option value="Chưa bắt đầu" ${node.status === 'Chưa bắt đầu' ? 'selected' : ''}>Chưa bắt đầu</option>
                <option value="Đang thực hiện" ${node.status === 'Đang thực hiện' ? 'selected' : ''}>Đang thực hiện</option>
                <option value="Hoàn thành" ${node.status === 'Hoàn thành' ? 'selected' : ''}>Hoàn thành</option>
            </select>
        </div>
        <div class="form-group">
            <label>Ghi chú</label>
            <textarea id="edit-node-notes">${escapeHTML(node.notes)}</textarea>
        </div>
        <div class="form-group">
            <label>Tài liệu đính kèm</label>
            <div class="settings-input-group">
                <select id="attach-doc-select"><option value="">Chọn tài liệu từ thư viện...</option>${availableDocs}</select>
                <button class="btn-submit" onclick="attachDocumentToNode()">Đính kèm</button>
            </div>
            <ul id="attached-docs-list" class="attached-docs-list"></ul>
        </div>
        <button class="btn-submit" onclick="saveNodeChanges()">Lưu thay đổi</button>
    `;

    renderAttachedDocs(node.attachedDocs);
    panel.classList.add('open');
    overlay.classList.add('active');
}
function renderAttachedDocs(docIds) {
    const list = document.getElementById('attached-docs-list');
    list.innerHTML = '';
    docIds.forEach(docId => {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
            const li = document.createElement('li');
            li.className = 'attached-doc-item';
            li.innerHTML = `
                <span class="doc-info">${getDocumentTypeIcon(doc.type)} ${escapeHTML(doc.title)}</span>
                <button onclick="detachDocumentFromNode('${doc.id}')">×</button>
            `;
            list.appendChild(li);
        }
    });
}
function closeNodePanel() {
    document.getElementById('outline-node-side-panel').classList.remove('open');
    document.getElementById('outline-node-panel-overlay').classList.remove('active');
    editingItemId = null;
}
async function saveNodeChanges() {
    const outline = outlines.find(o => o.id === currentlySelectedOutlineId);
    if (!outline) return;

    const { node } = findNode(outline.nodes, editingItemId);
    if (!node) return;
    
    node.title = document.getElementById('edit-node-title').value.trim();
    node.status = document.getElementById('edit-node-status').value;
    node.notes = document.getElementById('edit-node-notes').value.trim();

    await saveAllData();
    renderOutlineEditor(currentlySelectedOutlineId);
    closeNodePanel();
    showNotification('Đã cập nhật mục thành công!', 'success');
}
function attachDocumentToNode() {
    const outline = outlines.find(o => o.id === currentlySelectedOutlineId);
    if (!outline) return;

    const { node } = findNode(outline.nodes, editingItemId);
    const docId = document.getElementById('attach-doc-select').value;
    if (docId && node && !node.attachedDocs.includes(docId)) {
        node.attachedDocs.push(docId);
        renderAttachedDocs(node.attachedDocs);
        saveAllData();
    }
}
function detachDocumentFromNode(docId) {
    const outline = outlines.find(o => o.id === currentlySelectedOutlineId);
    if (!outline) return;

    const { node } = findNode(outline.nodes, editingItemId);
    if (node) {
        node.attachedDocs = node.attachedDocs.filter(id => id !== docId);
        renderAttachedDocs(node.attachedDocs);
        saveAllData();
    }
}
function openDocumentModal(id = null) {
    const modal = document.getElementById('document-modal');
    const titleEl = document.getElementById('document-modal-title');
    const idInput = document.getElementById('doc-id');
    const titleInput = document.getElementById('doc-title');
    const typeSelect = document.getElementById('doc-type');
    const sourceInput = document.getElementById('doc-source');
    const tagsInput = document.getElementById('doc-tags');
    const notesTextarea = document.getElementById('doc-notes');
    const fileNameEl = document.getElementById('document-file-name');
    const deleteBtn = document.getElementById('delete-doc-btn');
    currentDocumentFile = null;
    if (id) {
        const doc = documents.find(d => d.id === id);
        if (doc) {
            titleEl.textContent = 'Sửa Tài liệu';
            idInput.value = doc.id;
            titleInput.value = doc.title;
            typeSelect.value = doc.type;
            sourceInput.value = doc.source || '';
            tagsInput.value = doc.tags.join(', ');
            notesTextarea.value = doc.notes || '';
            fileNameEl.textContent = doc.fileName ? `Tệp hiện tại: ${doc.fileName}` : 'Chưa có tệp đính kèm.';
            deleteBtn.style.display = 'inline-block';
            deleteBtn.onclick = () => deleteDocument(id);
        }
    } else {
        titleEl.textContent = 'Thêm Tài liệu Mới';
        idInput.value = '';
        titleInput.value = '';
        typeSelect.value = 'article';
        sourceInput.value = '';
        tagsInput.value = '';
        notesTextarea.value = '';
        fileNameEl.textContent = '';
        deleteBtn.style.display = 'none';
    }
    modal.style.display = 'flex';
}
function closeDocumentModal() { document.getElementById('document-modal').style.display = 'none'; currentDocumentFile = null; }
function handleDocumentFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        currentDocumentFile = file;
        document.getElementById('document-file-name').textContent = `Tệp đã chọn: ${file.name}`;
    }
}
async function saveDocument() {
    const id = document.getElementById('doc-id').value;
    const title = document.getElementById('doc-title').value.trim();
    if (!title) { showNotification('Tiêu đề tài liệu không được để trống!', 'error'); return; }
    let docData;
    if (id) { docData = documents.find(d => d.id === id); }
    else { docData = { id: `doc_${crypto.randomUUID()}`, dateAdded: new Date().toISOString() }; }
    docData.title = title;
    docData.type = document.getElementById('doc-type').value;
    docData.source = document.getElementById('doc-source').value.trim();
    docData.tags = document.getElementById('doc-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    docData.notes = document.getElementById('doc-notes').value.trim();
    if (currentDocumentFile) {
        if (docData.fileId) { await dbDelete('files', docData.fileId); }
        const fileId = `file_${crypto.randomUUID()}`;
        await dbSet('files', { id: fileId, file: currentDocumentFile });
        docData.fileId = fileId;
        docData.fileName = currentDocumentFile.name;
    }
    if (!id) { documents.push(docData); }
    await saveAllData();
    renderDigitalLibrary();
    closeDocumentModal();
    showNotification(id ? 'Cập nhật tài liệu thành công!' : 'Đã thêm tài liệu mới!', 'success');
}
async function deleteDocument(id) {
    showConfirmModal('Bạn có chắc muốn xóa tài liệu này? Mọi tệp đính kèm cũng sẽ bị xóa vĩnh viễn.', async () => {
        const docIndex = documents.findIndex(d => d.id === id);
        if (docIndex > -1) {
            const docToDelete = documents[docIndex];
            if (docToDelete.fileId) { await dbDelete('files', docToDelete.fileId); }
            documents.splice(docIndex, 1);
            await saveAllData();
            renderDigitalLibrary();
            closeDocumentModal();
            closeDocumentViewer();
            showNotification('Đã xóa tài liệu.', 'success');
        }
    });
}
async function openDocumentViewer(id) {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    const modal = document.getElementById('document-viewer-modal');
    const titleEl = document.getElementById('viewer-title');
    const bodyEl = document.getElementById('viewer-body');
    titleEl.textContent = doc.title;
    let fileButtonHtml = 'Không có tệp đính kèm';
    if (doc.fileId) { fileButtonHtml = `<button class="btn-submit" style="padding: 0.5rem 1rem;" onclick="viewProof('${doc.fileId}')">Xem Tệp (${escapeHTML(doc.fileName)})</button>`; }
    bodyEl.innerHTML = `
        <dl class="doc-viewer-meta">
            <div class="doc-viewer-meta-grid">
                <div><dt>Loại</dt><dd>${getDocumentTypeName(doc.type)}</dd></div>
                <div><dt>Nguồn</dt><dd><a href="${doc.source}" target="_blank" rel="noopener noreferrer">${escapeHTML(doc.source) || 'Không có'}</a></dd></div>
                <div><dt>Ngày thêm</dt><dd>${formatISOToVietnamese(doc.dateAdded)}</dd></div>
                <div><dt>Tệp</dt><dd>${fileButtonHtml}</dd></div>
            </div>
            <div style="margin-top: 1rem;"><dt>Thẻ</dt><dd class="doc-card-tags">${doc.tags.map(tag => `<span class="tag-badge">${escapeHTML(tag)}</span>`).join('')}</dd></div>
        </dl>
        <div class="doc-viewer-notes">
            <h4>Tóm tắt / Ghi chú</h4>
            <div class="doc-viewer-notes-content">${escapeHTML(doc.notes) || '<i>Không có ghi chú.</i>'}</div>
        </div>`;
    modal.style.display = 'flex';
}
function closeDocumentViewer() { document.getElementById('document-viewer-modal').style.display = 'none'; }
function getDocumentTypeIcon(type) { switch(type) { case 'article': return '📄'; case 'case': return '⚖️'; case 'law': return '🏛️'; case 'book': return '📚'; default: return '📎'; } }
function getDocumentTypeName(type) { switch(type) { case 'article': return 'Bài báo Khoa học'; case 'case': return 'Án lệ'; case 'law': return 'Văn bản QPPL'; case 'book': return 'Sách chuyên khảo'; default: return 'Khác'; } }

// --- SETTINGS & PROFILE ---
function renderSettings(){
    populateSelectOptions();
    ["categories","statuses"].forEach(e=>{const t=document.getElementById(`${e}-list`),n=settings[e]||[];t.innerHTML=n.map((t,n)=>`<li>${escapeHTML(t)} <button onclick="deleteSettingItem('${e}', ${n})">&times;</button></li>`).join("")});
    
    renderProjectSettingsList();
    
    document.getElementById('dark-mode-toggle').checked = settings.darkMode;
    document.getElementById('notification-toggle').checked = settings.notificationsEnabled;

    document.getElementById('primary-blue-color-picker').value = customColors.primaryBlue;
    document.getElementById('primary-orange-color-picker').value = customColors.primaryOrange;
}
function renderProjectSettingsList() {
    const projectSettingsList = document.getElementById('project-settings-list');
    if (!projectSettingsList) return;
    projectSettingsList.innerHTML = '';
    projects.forEach(project => {
        const li = document.createElement('li');
        li.innerHTML = `${escapeHTML(project.name)} <button onclick="openProjectModal('${project.id}')" class="btn-action" style="background-color: var(--primary-blue); color: white; padding: 0.3rem 0.6rem; border-radius: 4px; border: none;">Sửa</button> <button onclick="deleteProject('${project.id}')">&times;</button>`;
        projectSettingsList.appendChild(li);
    });
}
async function addSettingItem(e,t){const n=document.getElementById(t),o=n.value.trim();if(o){if((settings[e]||[]).includes(o)){showNotification('Mục này đã tồn tại!', 'warning'); return;}settings[e].push(o),n.value="",await saveAllData(),renderSettings(),showNotification('Đã thêm mục mới!','success')}}
async function deleteSettingItem(key, index) {
    const itemToDelete = settings[key][index];
    showConfirmModal(`Bạn có chắc muốn xóa mục "${escapeHTML(itemToDelete)}"?`, async () => {
        settings[key].splice(index, 1);
        await saveAllData();
        renderSettings();
        renderCalendar();
        renderTasks();
        renderDashboard();
        renderStatistics();
        showNotification('Đã xóa mục.','success');
    });
}
async function loadProfilePicture(){const e="https://placehold.co/100x100/E9ECEF/6C757D?text=Avatar";try{const t=await dbGet("files","profilePicture"),n=t&&t.file?URL.createObjectURL(t.file):null;document.getElementById("sidebar-profile-pic").src=n||e.replace("100x100","80x80"),document.getElementById("profile-pic-preview").src=n||e}catch(t){document.getElementById("sidebar-profile-pic").src=e.replace("100x100","80x80"),document.getElementById("profile-pic-preview").src=e}}async function handleProfilePictureUpload(e){const t=e.target.files[0];t&&(await dbSet("files",{id:"profilePicture",file:t}),await loadProfilePicture(),showNotification("Cập nhật ảnh đại diện thành công!","success"))}async function removeAvatar(){showConfirmModal("Bạn có chắc muốn xóa ảnh đại diện?",async()=>{await dbDelete("files","profilePicture"),await loadProfilePicture(),showNotification("Đã xóa ảnh đại diện.","success")})}
function toggleDarkMode() { settings.darkMode = !settings.darkMode; document.body.classList.toggle('dark-mode', settings.darkMode); document.getElementById('dark-mode-toggle').checked = settings.darkMode; saveAllData(); showNotification(`Chế độ tối đã ${settings.darkMode ? 'bật' : 'tắt'}.`, 'success'); }
function applyDarkModeSetting() { document.body.classList.toggle('dark-mode', settings.darkMode); const toggle = document.getElementById('dark-mode-toggle'); if (toggle) { toggle.checked = settings.darkMode; } }
async function toggleNotifications() {
    settings.notificationsEnabled = !settings.notificationsEnabled;
    if (settings.notificationsEnabled) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            settings.notificationsEnabled = false;
            showNotification('Bạn đã từ chối quyền thông báo.', 'error');
        } else {
            showNotification('Thông báo đã được bật.', 'success');
            scheduleNotifications();
        }
    } else {
        showNotification('Thông báo đã được tắt.', 'warning');
        notificationTimeoutIds.forEach(id => clearTimeout(id));
        notificationTimeoutIds = [];
    }
    document.getElementById('notification-toggle').checked = settings.notificationsEnabled;
    saveAllData();
}
let notificationTimeoutIds = [];
function scheduleNotifications() {
    notificationTimeoutIds.forEach(id => clearTimeout(id));
    notificationTimeoutIds = [];
    if (!settings.notificationsEnabled || Notification.permission !== 'granted') return;
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const todayStr = toLocalISOString(now);
    calendarEvents.forEach(event => {
        const eventDateTime = new Date(`${event.date}T${event.startTime}`);
        const reminderTime = new Date(eventDateTime.getTime() - 15 * 60 * 1000);
        if (reminderTime > now && reminderTime.getTime() - now.getTime() < 24 * oneHour) {
            const delay = reminderTime.getTime() - now.getTime();
            const timeoutId = setTimeout(() => { new Notification('Nhắc nhở sự kiện', { body: `Sự kiện "${event.title}" sẽ bắt đầu lúc ${event.startTime}!` }); }, delay);
            notificationTimeoutIds.push(timeoutId);
        }
    });
    tasks.forEach(task => {
        if (task.dueDate === todayStr && task.status !== settings.statuses[settings.statuses.length - 1]) {
             const nineAM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
            if (nineAM > now && nineAM.getTime() - now.getTime() < 24 * oneHour) {
                const delay = nineAM.getTime() - now.getTime();
                 const timeoutId = setTimeout(() => { new Notification('Nhắc nhở công việc', { body: `Công việc "${task.name}" cần hoàn thành hôm nay!` }); }, delay);
                notificationTimeoutIds.push(timeoutId);
            }
        }
    });
}
function applyCustomColors() {
    const root = document.documentElement;
    root.style.setProperty('--custom-primary-blue', customColors.primaryBlue);
    root.style.setProperty('--custom-primary-orange', customColors.primaryOrange);
    const bluePicker = document.getElementById('primary-blue-color-picker');
    const orangePicker = document.getElementById('primary-orange-color-picker');
    if (bluePicker) bluePicker.value = customColors.primaryBlue;
    if (orangePicker) orangePicker.value = customColors.primaryOrange;
}
async function handleColorChange(event) {
    if (event.target.id === 'primary-blue-color-picker') { customColors.primaryBlue = event.target.value; }
    else if (event.target.id === 'primary-orange-color-picker') { customColors.primaryOrange = event.target.value; }
    applyCustomColors();
    await saveAllData();
    renderTasks();
    renderStatistics();
    renderStudentJourney();
}
async function resetColors() {
    showConfirmModal('Bạn có chắc muốn khôi phục màu sắc mặc định?', async () => {
        customColors = { primaryBlue: '#005B96', primaryOrange: '#FF7A00' };
        applyCustomColors();
        await saveAllData();
        renderTasks();
        renderStatistics();
        renderStudentJourney();
        showNotification('Đã khôi phục màu sắc mặc định.', 'success');
    });
}

// --- MODALS ---
function openEditModal(context, id = null) {
    editingItemId = id;
    editingContext.type = context;
    const modal = document.getElementById("edit-modal");
    const titleEl = document.getElementById("modal-title");
    const bodyEl = document.getElementById("modal-body");
    if (context === 'personal-info') {
        titleEl.textContent = "Chỉnh sửa thông tin cá nhân";
        bodyEl.innerHTML = `<div class="form-group"><label>Tên đầy đủ</label><input id="edit-pi-full-name" value="${escapeHTML(personalInfo.fullName || '')}"></div><div class="form-group"><label>Ngày sinh</label><input type="date" id="edit-pi-dob" value="${personalInfo.dob || ''}"></div><div class="form-group"><label>Email</label><input type="email" id="edit-pi-email" value="${escapeHTML(personalInfo.email || '')}"></div><div class="form-group"><label>Điện thoại</label><input type="tel" id="edit-pi-phone" value="${escapeHTML(personalInfo.phone || '')}"></div><div class="form-group"><label>Nghề nghiệp</label><input type="text" id="edit-pi-occupation" value="${escapeHTML(personalInfo.occupation || '')}"></div><div class="form-group"><label>Mạng xã hội</label><input type="url" id="edit-pi-social" value="${escapeHTML(personalInfo.socialLink || '')}"></div><button class="btn-submit" onclick="savePersonalInfoChanges()">Lưu thay đổi</button>`;
        modal.style.display = "flex";
    }
    else if (context === 'task') {
        const task = tasks.find(t => t.id === id);
        if (task) {
            titleEl.textContent = "Sửa công việc";
            bodyEl.innerHTML = `<div class="form-group"><label>Tên</label><input id="edit-task-name" value="${escapeHTML(task.name)}"></div><div class="form-group"><label>Ưu tiên</label><select id="edit-task-priority"><option value="low" ${task.priority==='low'?'selected':''}>Thấp</option><option value="medium" ${task.priority==='medium'?'selected':''}>Trung bình</option><option value="high" ${task.priority==='high'?'selected':''}>Cao</option></select></div><div class="form-group"><label>Phân loại</label><select id="edit-task-category">${settings.categories.map(cat => `<option value="${escapeHTML(cat)}" ${task.category === cat ? "selected" : ""}>${escapeHTML(cat)}</option>`).join("")}</select></div><div class="form-group"><label>Hạn chót</label><input type="date" id="edit-task-due-date" value="${task.dueDate}"></div><div class="form-group"><label>Tiến độ</label><select id="edit-task-status">${settings.statuses.map(st => `<option value="${escapeHTML(st)}" ${task.status === st ? "selected" : ""}>${escapeHTML(st)}</option>`).join("")}</select></div><div class="form-group"><label>Lặp lại</label><select id="edit-task-recurrence"><option value="none" ${task.recurrence.type==='none'?'selected':''}>Không</option><option value="daily" ${task.recurrence.type==='daily'?'selected':''}>Hàng ngày</option><option value="weekly" ${task.recurrence.type==='weekly'?'selected':''}>Hàng tuần</option><option value="monthly" ${task.recurrence.type==='monthly'?'selected':''}>Hàng tháng</option></select></div><div class="form-group"><label>Dự án</label><select id="edit-task-project"><option value="">Không có</option>${projects.map(p => `<option value="${p.id}" ${task.projectId === p.id ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('')}</select></div><div class="form-group"><label>Đính kèm</label><input id="edit-task-link" value="${escapeHTML(task.link || '')}"></div><div class="form-group"><label>Thẻ</label><input type="text" id="edit-task-tags" value="${(task.tags || []).join(', ')}"></div><div class="form-group"><label>Ghi chú</label><textarea id="edit-task-notes">${escapeHTML(task.notes || '')}</textarea></div><button class="btn-submit" onclick="saveTaskChanges()">Lưu thay đổi</button>`;
            modal.style.display = "flex";
        }
    }
}
function closeModal(){document.getElementById("edit-modal").style.display="none",editingItemId=null, editingContext={}}
async function savePersonalInfoChanges() {
    personalInfo.fullName = document.getElementById('edit-pi-full-name').value.trim();
    personalInfo.dob = document.getElementById('edit-pi-dob').value;
    personalInfo.email = document.getElementById('edit-pi-email').value.trim();
    personalInfo.phone = document.getElementById('edit-pi-phone').value.trim();
    personalInfo.occupation = document.getElementById('edit-pi-occupation').value.trim();
    personalInfo.socialLink = document.getElementById('edit-pi-social').value.trim();
    await saveAllData();
    renderPersonalInfo();
    renderDashboard();
    closeModal();
    showNotification('Đã cập nhật thông tin cá nhân!', 'success');
}
async function saveTaskChanges() {
    const task = tasks.find(t => t.id === editingItemId);
    if (task) {
        task.name = document.getElementById("edit-task-name").value.trim();
        task.category = document.getElementById("edit-task-category").value;
        task.dueDate = document.getElementById("edit-task-due-date").value;
        task.status = document.getElementById("edit-task-status").value;
        task.link = document.getElementById("edit-task-link").value.trim();
        task.notes = document.getElementById("edit-task-notes").value.trim();
        task.priority = document.getElementById('edit-task-priority').value;
        task.recurrence = { type: document.getElementById('edit-task-recurrence').value, interval: 1, endDate: null };
        if (task.recurrence.type !== 'none' && !task.lastGeneratedDate) {
            task.lastGeneratedDate = task.dueDate;
        }
        task.tags = document.getElementById('edit-task-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        task.projectId = document.getElementById('edit-task-project').value || '';
        await saveAllData();
        renderTasks();
        renderProjects();
        renderCalendar();
        renderDashboard();
        renderStatistics();
        closeModal();
        showNotification('Đã cập nhật công việc!','success');
        scheduleNotifications();
    }
}
function showConfirmModal(e,t){document.getElementById("confirm-modal-text").textContent=e,confirmAction=t,document.getElementById("confirm-modal").style.display="flex"}function closeConfirmModal(){document.getElementById("confirm-modal").style.display="none",confirmAction=null}

// --- GENERAL UTILITIES ---
function toLocalISOString(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function fileToBase64(e){return new Promise((t,n)=>{const o=new FileReader;o.readAsDataURL(e),o.onload=()=>t(o.result),o.onerror=e=>n(e)})}function base64ToFile(e,t,n){const o=e.split(","),a=atob(o[1]);let d=a.length;const i=new Uint8Array(d);for(;d--;)i[d]=a.charCodeAt(d);return new File([i],t,{type:n})}function escapeHTML(e){if("string"!=typeof e)return"";const t=document.createElement("p");return t.textContent=e,t.innerHTML}function formatBytes(e){if(!e||0===e)return"0 Bytes";const t=1024,n=["Bytes","KB","MB","GB"],o=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,o)).toFixed(2))+" "+n[o]}function getFileIcon(e=""){return e.startsWith("image/")?"🖼️":e.includes("pdf")?"📄":e.includes("word")?"📝":e.includes("spreadsheet")||e.includes("excel")?"📊":"📁"}function populateSelectOptions(){
    const taskCategorySelect = document.getElementById("task-category");
    if(taskCategorySelect) {
        taskCategorySelect.innerHTML=settings.categories.map(e=>`<option value="${escapeHTML(e)}">${escapeHTML(e)}</option>`).join("");
    }
    const taskStatusSelect = document.getElementById("task-status");
    if(taskStatusSelect) {
        taskStatusSelect.innerHTML=settings.statuses.map(e=>`<option value="${escapeHTML(e)}">${escapeHTML(e)}</option>`).join("");
    }
}
function stringToHslColor(e="",t=60,n=85){let o=0;for(let t=0;t<e.length;t++)o=e.charCodeAt(t)+((o<<5)-o);return`hsl(${o%360}, ${t}%, ${n}%)`}
function formatISOToVietnamese(isoString) {
    if (!isoString || typeof isoString !== 'string') return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
function formatYYYYMMDD_to_DDMMYYYY(dateString) { if (!dateString) return ""; const [year, month, day] = dateString.split('-'); return `${day}/${month}/${year}`; }
function formatDateToDDMMYYYY(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
function showNotification(e,t="success"){const n=document.getElementById("notification-container"),o=document.createElement("div");o.className=`notification ${t}`,o.textContent=e,n.appendChild(o),setTimeout(()=>{o.remove()},4e3)}function getMonday(e){const t=new Date(e),n=(t.getDay()+6)%7;return t.setDate(t.getDate()-n),t.setHours(0,0,0,0),t}
function isSameDay(e,t){ if (!(e instanceof Date) || isNaN(e) || !(t instanceof Date) || isNaN(t)) return false; return e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()&&e.getDate()===t.getDate() }

// --- APP STARTUP ---
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('loading-spinner').style.display = 'flex';
        setTimeout(showApp, 500);
    } else {
        showLoginScreen();
    }

    setInterval(updateTimeAndLocation, 1000);
    setInterval(updateCurrentTimeIndicator, 60000);
    getLocation();

    // Event listeners
    document.getElementById('password').addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });
    document.getElementById('import-file-input').addEventListener('change', handleImportFile);
    document.getElementById('profile-pic-input').addEventListener('change', handleProfilePictureUpload);
    document.getElementById('proof-upload-input').addEventListener('change', handleProofUpload);
    document.getElementById('achievement-file-input').addEventListener('change', handleAchievementFileSelect);
    document.getElementById('proof-search').addEventListener('input', renderProofsManagement);
    document.getElementById('prev-btn').addEventListener('click', () => changeCalendarViewDate(-1));
    document.getElementById('next-btn').addEventListener('click', () => changeCalendarViewDate(1));
    document.getElementById('view-week-btn').addEventListener('click', () => toggleCalendarView('week'));
    document.getElementById('view-month-btn').addEventListener('click', () => toggleCalendarView('month'));
    document.getElementById('dark-mode-toggle').addEventListener('change', toggleDarkMode);
    document.getElementById('notification-toggle').addEventListener('change', toggleNotifications);
    document.getElementById('quick-add-task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') quickAddTask(); });
    document.getElementById('task-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
    document.getElementById('new-project-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') addProjectFromSettings(); });
    document.getElementById('primary-blue-color-picker').addEventListener('input', handleColorChange);
    document.getElementById('primary-orange-color-picker').addEventListener('input', handleColorChange);

    // BỔ SUNG: Event listeners cho các tính năng mới
    document.getElementById('new-todo-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodoItem(); });
    document.getElementById('drafts-search').addEventListener('input', renderDraftsList);
    document.getElementById('document-file-input').addEventListener('change', handleDocumentFileSelect);
    document.getElementById('library-search').addEventListener('input', renderDigitalLibrary);
    document.getElementById('library-sort').addEventListener('change', renderDigitalLibrary);
    document.getElementById('outline-search').addEventListener('input', renderOutlineList);
    document.getElementById('outline-node-panel-close-btn').addEventListener('click', closeNodePanel);
    document.getElementById('outline-node-panel-overlay').addEventListener('click', closeNodePanel);

    document.getElementById('pomodoro-start-btn').addEventListener('click', startPomodoro);
    document.getElementById('pomodoro-pause-btn').addEventListener('click', pausePomodoro);
    document.getElementById('pomodoro-reset-btn').addEventListener('click', resetPomodoro);
    document.getElementById('focus-duration').addEventListener('change', updatePomodoroSettings);
    document.getElementById('break-duration').addEventListener('change', updatePomodoroSettings);

    document.querySelectorAll('.nav-group-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const group = toggle.parentElement;
            group.classList.toggle('open');
        });
    });

    document.getElementById('confirm-modal-btn').addEventListener('click', () => {
        if (typeof confirmAction === 'function') confirmAction();
        closeConfirmModal();
    });
    
    document.getElementById('sv5t-panel-close-btn').addEventListener('click', closeSidePanel);
    document.getElementById('sv5t-panel-overlay').addEventListener('click', closeSidePanel);
    
    window.addEventListener('click', (e) => { 
        if (e.target.classList.contains('modal')) {
            closeModal();
            closeConfirmModal();
            closeEventModal();
            closeAchievementModal();
            closeProjectModal();
            closeDocumentModal();
            closeDocumentViewer();
            closeOutlineModal();
        }
    });

    const initialActiveButton = document.querySelector('.nav-btn[onclick*="dashboard"]');
    showSection('dashboard', initialActiveButton);
});
