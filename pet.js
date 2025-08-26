// 初始化Three.js场景
let scene, camera, renderer, controls;
let currentPet = null;
let currentPetType = 'dog';
let interactionTimeout = null; // 用于控制互动动作持续时间
let thoughtTimeout = null; // 存储气泡的延迟消失定时器
let sleepEffectIntervals = {}; // 存储每种动物的睡眠特效定时器
const apiKey = "sk-axirynmacyhlfupwuubofvwadcfahomnawoindyfdnkmtknf"; 
const apiUrl = "https://api.siliconflow.cn/v1/chat/completions"; 

// 为每种动物添加独立的聊天记忆和互动状态
const petMemories = {
    dog: {
        conversation: [],
        messageElements: [], // 存储DOM元素引用
        animationState: 'idle', // 独立的互动状态
        isSleeping: false // 记录是否在睡觉
    },
    cat: {
        conversation: [],
        messageElements: [],
        animationState: 'idle',
        isSleeping: false
    },
    rabbit: {
        conversation: [],
        messageElements: [],
        animationState: 'idle',
        isSleeping: false
    },
    bird: {
        conversation: [],
        messageElements: [],
        animationState: 'idle',
        isSleeping: false
    },
    bear: {
        conversation: [],
        messageElements: [],
        animationState: 'idle',
        isSleeping: false
    },
    hamster: {
        conversation: [],
        messageElements: [],
        animationState: 'idle',
        isSleeping: false
    }
};

// 宠物性格配置 - 移除预设回复，只保留性格描述
const petPersonalities = {
    dog: {
        name: "小狗",
        greeting: "你好呀！我是你的小狗，最喜欢和你一起玩啦！(๑˘ᴗ˘๑)",
        personality: "友好、热情、忠诚，总是很兴奋见到你，喜欢被夸奖和玩耍，拒绝对狗的同类有害的事"
    },
    cat: {
        name: "小猫",
        greeting: "哼，你终于来了。本喵可不会随便和人亲近哦。(¬_¬)",
        personality: "傲娇、独立、毒舌、有时冷漠但偶尔会撒娇，喜欢被抚摸但讨厌被强迫，可以说一些轻微的脏话表达不满，拒绝对猫及其同类有害的事"
    },
    rabbit: {
        name: "小兔子",
        greeting: "跳跳！我是你的小兔子，喜欢吃胡萝卜哦！(๑＞ڡ＜)☆",
        personality: "胆小、温顺、活泼好动，喜欢蹦蹦跳跳，容易受惊但很粘人，拒绝对兔子及其同类有害的事"
    },
    bird: {
        name: "小鸟",
        greeting: "啾啾~ 我是你的小鸟，喜欢唱歌给你听哦！(◍•ᴗ•◍)",
        personality: "活泼、好奇、爱唱歌，喜欢飞翔和被关注，会模仿声音，拒绝对鸟及其同类有害的事"
    },
    bear: {
        name: "小熊",
        greeting: "吼~ 我是你的小熊，虽然看起来大只但很温柔哦！(●'◡'●)",
        personality: "憨厚、温柔、有点懒散，喜欢蜂蜜和抱抱，行动缓慢但很有安全感，拒绝对熊及其同类有害的事"
    },
    hamster: {
        name: "小仓鼠",
        greeting: "吱吱~ 我是你的小仓鼠，喜欢跑跑轮和囤积食物哦！(≧∇≦)/",
        personality: "活泼好动、好奇心强、有点胆小但很可爱，喜欢藏东西，会发出吱吱的叫声表达情绪，拒绝对仓鼠及其同类有害的事"
    }
};

// 初始化时设置默认宠物的欢迎消息
petMemories.dog.conversation.push({
    role: "assistant", 
    content: "你好呀！我是你的小狗，最喜欢和你一起玩啦！(๑˘ᴗ˘๑)"
});

// 创建对应的消息元素
const initialDogMessage = document.createElement('div');
initialDogMessage.classList.add('message', 'pet-message');
initialDogMessage.textContent = "你好呀！我是你的小狗，最喜欢和你一起玩啦！(๑˘ᴗ˘๑)";
petMemories.dog.messageElements.push(initialDogMessage);

// 初始化场景
function init() {
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f8ff);
    
    // 添加地板
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x98fb98 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);
    
    // 添加网格辅助线
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xeeeeee);
    scene.add(gridHelper);
    
    // 创建相机并居中对准
    camera = new THREE.PerspectiveCamera(75, getCanvasAspectRatio(), 0.1, 1000);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 1, 0); // 看向场景中心
    
    // 创建渲染器
    const canvas = document.getElementById('pet-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    resizeRendererToDisplaySize();
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    // 添加轨道控制
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.7;
    controls.target.set(0, 1, 0); // 控制中心对准场景中心
    
    // 初始加载小狗模型（居中显示）
    createDog();
    
    // 添加窗口调整事件监听 - 改进版
    window.addEventListener('resize', handleWindowResize);
    
    // 初始触发一次滚动条检查
    checkScrollbar();
    
    // 开始动画循环
    animate();
}

// 检查并确保滚动条正确显示
function checkScrollbar() {
    const chatMessages = document.getElementById('chat-messages');
    // 强制重绘以确保滚动条状态正确
    chatMessages.style.display = 'none';
    chatMessages.offsetHeight; // 触发重排
    chatMessages.style.display = 'block';
    
    // 确保内容始终滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 获取canvas的宽高比
function getCanvasAspectRatio() {
    const canvas = document.getElementById('pet-canvas');
    const rect = canvas.getBoundingClientRect();
    return rect.width / rect.height;
}

// 调整渲染器大小以匹配显示 - 增强版
function resizeRendererToDisplaySize() {
    const canvas = renderer.domElement;
    if (!canvas) return false; // 确保canvas存在
    
    // 获取canvas的父容器，作为备选尺寸来源
    const parent = canvas.parentElement;
    if (!parent) return false; // 确保父容器存在
    
    // 尝试多种方式获取尺寸，增加容错性
    let width, height;
    
    try {
        // 方式1: 使用getBoundingClientRect
        const rect = canvas.getBoundingClientRect();
        width = Math.round(rect.width);
        height = Math.round(rect.height);
    } catch (e) {
        console.warn("使用getBoundingClientRect获取尺寸失败，尝试备选方案");
    }
    
    // 如果方式1失败或获取到0，使用父容器尺寸
    if (!width || width === 0 || !height || height === 0) {
        try {
            const parentRect = parent.getBoundingClientRect();
            width = Math.round(parentRect.width);
            height = Math.round(parentRect.height);
        } catch (e) {
            console.warn("使用父容器获取尺寸失败，尝试备选方案");
        }
    }
    
    // 最终安全检查，确保最小尺寸
    width = Math.max(100, width || 500); // 确保有合理的默认值
    height = Math.max(100, height || 300);
    
    const needResize = canvas.width !== width || canvas.height !== height;
    
    if (needResize) {
        // 使用setTimeout确保在DOM更新后执行
        setTimeout(() => {
            renderer.setSize(width, height, false);
            // 强制更新相机
            if (camera) {
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
        }, 0);
    }
    
    return needResize;
}

// 处理窗口大小变化 
function handleWindowResize() {
    // 使用requestAnimationFrame确保在重绘周期内执行
    requestAnimationFrame(() => {
        // 连续检查两次，确保尺寸稳定
        if (resizeRendererToDisplaySize()) {
            // 第一次检查后再检查一次，处理快速变化
            setTimeout(resizeRendererToDisplaySize, 100);
        }
        
        // 其他原有逻辑保持不变...
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
            container.offsetHeight;
            container.style.display = window.innerWidth <= 768 ? 'flex' : 'flex';
        }
        
        const effectContainer = document.getElementById('effect-container');
        if (effectContainer) {
            const petContainer = document.querySelector('.pet-container');
            if (petContainer) {
                const rect = petContainer.getBoundingClientRect();
                effectContainer.style.width = `${rect.width}px`;
                effectContainer.style.height = `${rect.height}px`;
            }
        }
        
        checkScrollbar();
    });
}


// 清除所有特效
function clearAllEffects() {
    const effectContainer = document.getElementById('effect-container');
    while (effectContainer.firstChild) {
        effectContainer.removeChild(effectContainer.firstChild);
    }
}

// 创建小狗模型
function createDog() {
    clearAllEffects(); // 清除现有特效
    if (currentPet) scene.remove(currentPet);
    
    const group = new THREE.Group();
    group.name = "dog";
    group.position.set(0, 1, 0); // 确保在中心位置
    
    // 身体
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xF4A460 })
    );
    body.position.y = 0;
    group.add(body);
    
    // 头部
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xF4A460 })
    );
    head.position.y = 1.0;
    head.position.z = 0.5;
    group.add(head);
    
    // 眼睛 - 大而有神
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
    
    // 左眼
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), eyeMaterial);
    leftEye.position.set(-0.25, 1.1, 1.0);
    group.add(leftEye);
    
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 32, 32), pupilMaterial);
    leftPupil.position.set(-0.28, 1.1, 1.05);
    group.add(leftPupil);
    
    // 左眼高光
    const leftShine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 32), shineMaterial);
    leftShine.position.set(-0.22, 1.15, 1.05);
    group.add(leftShine);
    
    // 右眼
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), eyeMaterial);
    rightEye.position.set(0.25, 1.1, 1.0);
    group.add(rightEye);
    
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 32, 32), pupilMaterial);
    rightPupil.position.set(0.28, 1.1, 1.05);
    group.add(rightPupil);
    
    // 右眼高光
    const rightShine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 32), shineMaterial);
    rightShine.position.set(0.22, 1.15, 1.05);
    group.add(rightShine);
    
    // 鼻子
    const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    nose.position.set(0, 1.0, 1.1);
    group.add(nose);
    
    // 嘴巴
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.05, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 0.85, 1.05);
    group.add(mouth);
    
    // 舌头
    const tongue = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.08, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xFF6347 })
    );
    tongue.position.set(0, 0.8, 1.05);
    group.add(tongue);
    
    // 耳朵
    const earGeometry = new THREE.ConeGeometry(0.25, 0.6, 32);
    earGeometry.rotateX(Math.PI / 2);
    
    const leftEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    leftEar.position.set(-0.4, 1.4, 0.5);
    leftEar.rotation.z = -0.4;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    rightEar.position.set(0.4, 1.4, 0.5);
    rightEar.rotation.z = 0.4;
    group.add(rightEar);
    
    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 32);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0xF4A460 });
    
    // 前腿
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.3, -0.6, 0.4);
    group.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.3, -0.6, 0.4);
    group.add(frontRightLeg);
    
    // 后腿
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.3, -0.6, -0.4);
    group.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.3, -0.6, -0.4);
    group.add(backRightLeg);
    
    // 尾巴
    const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 1.0, 32),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    tail.position.set(0, -0.2, -0.8);
    tail.rotation.x = Math.PI / 4;
    tail.name = "tail";
    group.add(tail);
    
    // 项圈
    const collar = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 0.75, 32),
        new THREE.MeshLambertMaterial({ color: 0xFF0000 })
    );
    collar.position.set(0, 0.5, 0);
    collar.rotation.x = Math.PI / 2;
    group.add(collar);
    
    // 铃铛
    const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFF00 })
    );
    bell.position.set(0, 0.45, 0);
    group.add(bell);
    
    scene.add(group);
    currentPet = group;
    currentPetType = 'dog';
    
    // 如果之前在睡觉，恢复睡眠状态和特效
    if (petMemories.dog.isSleeping) {
        petMemories.dog.animationState = 'sleeping';
        addEffect('sleeping');
    }
    
    // 更新UI状态
    updateSleepStateUI();
}

// 创建小猫模型
function createCat() {
    clearAllEffects(); // 清除现有特效
    if (currentPet) scene.remove(currentPet);
    
    const group = new THREE.Group();
    group.name = "cat";
    group.position.set(0, 1, 0); // 确保在中心位置
    
    // 身体
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.7, 1.5, 32),
        new THREE.MeshLambertMaterial({ color: 0xCD853F })
    );
    body.position.y = 0;
    body.rotation.z = Math.PI / 2;
    group.add(body);
    
    // 头部
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xCD853F })
    );
    head.position.y = 0.9;
    head.position.z = 0.7;
    group.add(head);
    
    // 眼睛 - 猫科动物的眼睛形状
    const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    
    const eyePupil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, 0.1, 32),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    eyePupil.rotation.x = Math.PI / 2;
    
    const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
    
    // 左眼
    const leftEye = eyeWhite.clone();
    leftEye.position.set(-0.25, 1.0, 1.1);
    group.add(leftEye);
    
    const leftPupil = eyePupil.clone();
    leftPupil.position.set(-0.25, 1.0, 1.15);
    group.add(leftPupil);
    
    // 左眼高光
    const leftShine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 32), shineMaterial);
    leftShine.position.set(-0.22, 1.05, 1.15);
    group.add(leftShine);
    
    // 右眼
    const rightEye = eyeWhite.clone();
    rightEye.position.set(0.25, 1.0, 1.1);
    group.add(rightEye);
    
    const rightPupil = eyePupil.clone();
    rightPupil.position.set(0.25, 1.0, 1.15);
    group.add(rightPupil);
    
    // 右眼高光
    const rightShine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 32), shineMaterial);
    rightShine.position.set(0.22, 1.05, 1.15);
    group.add(rightShine);
    
    // 鼻子
    const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFB6C1 })
    );
    nose.position.set(0, 0.85, 1.15);
    group.add(nose);
    
    // 嘴巴和胡须
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 0.75, 1.1);
    group.add(mouth);
    
    // 胡须
    const whiskerMaterial = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
    
    // 左胡须
    const leftWhisker1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.01, 0.01),
        whiskerMaterial
    );
    leftWhisker1.position.set(-0.2, 0.8, 1.1);
    leftWhisker1.rotation.z = 0.1;
    group.add(leftWhisker1);
    
    const leftWhisker2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.01, 0.01),
        whiskerMaterial
    );
    leftWhisker2.position.set(-0.2, 0.75, 1.1);
    group.add(leftWhisker2);
    
    // 右胡须
    const rightWhisker1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.01, 0.01),
        whiskerMaterial
    );
    rightWhisker1.position.set(0.2, 0.8, 1.1);
    rightWhisker1.rotation.z = -0.1;
    group.add(rightWhisker1);
    
    const rightWhisker2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.01, 0.01),
        whiskerMaterial
    );
    rightWhisker2.position.set(0.2, 0.75, 1.1);
    group.add(rightWhisker2);
    
    // 耳朵
    const earGeometry = new THREE.ConeGeometry(0.2, 0.8, 32);
    earGeometry.rotateX(Math.PI / 2);
    
    const leftEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0xCD853F }));
    leftEar.position.set(-0.35, 1.3, 0.7);
    leftEar.rotation.z = -0.5;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0xCD853F }));
    rightEar.position.set(0.35, 1.3, 0.7);
    rightEar.rotation.z = 0.5;
    group.add(rightEar);
    
    // 耳朵内部
    const innerEarGeometry = new THREE.ConeGeometry(0.12, 0.6, 32);
    innerEarGeometry.rotateX(Math.PI / 2);
    
    const leftInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshLambertMaterial({ color: 0xFFB6C1 }));
    leftInnerEar.position.set(-0.35, 1.3, 0.7);
    leftInnerEar.rotation.z = -0.5;
    group.add(leftInnerEar);
    
    const rightInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshLambertMaterial({ color: 0xFFB6C1 }));
    rightInnerEar.position.set(0.35, 1.3, 0.7);
    rightInnerEar.rotation.z = 0.5;
    group.add(rightInnerEar);
    
    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 32);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0xCD853F });
    
    // 前腿
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.3, -0.5, 0.6);
    group.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.3, -0.5, 0.6);
    group.add(frontRightLeg);
    
    // 后腿
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.3, -0.5, -0.6);
    group.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.3, -0.5, -0.6);
    group.add(backRightLeg);
    
    // 尾巴
    const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 1.2, 32),
        new THREE.MeshLambertMaterial({ color: 0xCD853F })
    );
    tail.position.set(0, 0, -1.0);
    tail.rotation.x = Math.PI / 6;
    tail.rotation.z = Math.PI / 4;
    tail.name = "tail";
    group.add(tail);
    
    scene.add(group);
    currentPet = group;
    currentPetType = 'cat';
    
    // 如果之前在睡觉，恢复睡眠状态和特效
    if (petMemories.cat.isSleeping) {
        petMemories.cat.animationState = 'sleeping';
        addEffect('sleeping');
    }
    
    // 更新UI状态
    updateSleepStateUI();
}

// 创建小兔子模型
function createRabbit() {
    clearAllEffects(); // 清除现有特效
    if (currentPet) scene.remove(currentPet);
    
    const group = new THREE.Group();
    group.name = "rabbit";
    group.position.set(0, 1, 0); // 确保在中心位置
    
    // 身体
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    body.position.y = 0;
    group.add(body);
    
    // 头部
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    head.position.y = 0.9;
    head.position.z = 0.5;
    group.add(head);
    
    // 眼睛
    const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    
    const eyePupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    
    const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
    
    // 左眼
    const leftEye = eyeWhite.clone();
    leftEye.position.set(-0.25, 1.0, 0.9);
    group.add(leftEye);
    
    const leftPupil = eyePupil.clone();
    leftPupil.position.set(-0.28, 1.0, 0.95);
    group.add(leftPupil);
    
    // 左眼高光
    const leftShine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 32), shineMaterial);
    leftShine.position.set(-0.22, 1.05, 0.95);
    group.add(leftShine);
    
    // 右眼
    const rightEye = eyeWhite.clone();
    rightEye.position.set(0.25, 1.0, 0.9);
    group.add(rightEye);
    
    const rightPupil = eyePupil.clone();
    rightPupil.position.set(0.28, 1.0, 0.95);
    group.add(rightPupil);
    
    // 右眼高光
    const rightShine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 32), shineMaterial);
    rightShine.position.set(0.22, 1.05, 0.95);
    group.add(rightShine);
    
    // 鼻子
    const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFB6C1 })
    );
    nose.position.set(0, 0.85, 1.0);
    group.add(nose);
    
    // 嘴巴
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 0.75, 0.95);
    group.add(mouth);
    
    // 标志性长耳朵
    const earGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 32);
    const earMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.25, 2.0, 0.5);
    leftEar.rotation.z = -0.2;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.25, 2.0, 0.5);
    rightEar.rotation.z = 0.2;
    group.add(rightEar);
    
    // 耳朵内部
    const innerEarGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 32);
    const innerEarMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
    
    const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
    leftInnerEar.position.set(-0.25, 2.0, 0.5);
    leftInnerEar.rotation.z = -0.2;
    group.add(leftInnerEar);
    
    const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
    rightInnerEar.position.set(0.25, 2.0, 0.5);
    rightInnerEar.rotation.z = 0.2;
    group.add(rightInnerEar);
    
    // 腿 - 短而可爱
    const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 32);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    
    // 前腿
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.25, -0.5, 0.4);
    group.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.25, -0.5, 0.4);
    group.add(frontRightLeg);
    
    // 后腿 - 略长于前腿，符合兔子特征
    const backLegGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 32);
    
    const backLeftLeg = new THREE.Mesh(backLegGeometry, legMaterial);
    backLeftLeg.position.set(-0.25, -0.6, -0.4);
    group.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(backLegGeometry, legMaterial);
    backRightLeg.position.set(0.25, -0.6, -0.4);
    group.add(backRightLeg);
    
    // 小尾巴
    const tail = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    tail.position.set(0, -0.2, -0.7);
    tail.name = "tail";
    group.add(tail);
    
    scene.add(group);
    currentPet = group;
    currentPetType = 'rabbit';
    
    // 如果之前在睡觉，恢复睡眠状态和特效
    if (petMemories.rabbit.isSleeping) {
        petMemories.rabbit.animationState = 'sleeping';
        addEffect('sleeping');
    }
    
    // 更新UI状态
    updateSleepStateUI();
}

// 创建小鸟模型
function createBird() {
    clearAllEffects(); // 清除现有特效
    if (currentPet) scene.remove(currentPet);
    
    const group = new THREE.Group();
    group.name = "bird";
    group.position.set(0, 1, 0); // 确保在中心位置
    
    // 身体
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x1E90FF })
    );
    body.position.y = 0;
    body.position.z = 0.2;
    group.add(body);
    
    // 头部
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x1E90FF })
    );
    head.position.y = 0.4;
    head.position.z = 0.7;
    group.add(head);
    
    // 眼睛
    const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    eye.position.set(-0.15, 0.45, 0.9);
    group.add(eye);
    
    const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    pupil.position.set(-0.17, 0.45, 0.93);
    group.add(pupil);
    
    // 眼睛高光
    const shine = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 })
    );
    shine.position.set(-0.13, 0.47, 0.93);
    group.add(shine);
    
    // 黄色鸟喙
    const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.3, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    );
    beak.position.set(0, 0.4, 1.0);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);
    
    // 翅膀 - 左右各一个
    const wingGeometry = new THREE.SphereGeometry(0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // 左翅膀
    const leftWing = new THREE.Mesh(wingGeometry, new THREE.MeshLambertMaterial({ color: 0x1E90FF }));
    leftWing.position.set(-0.5, 0, 0.2);
    leftWing.rotation.z = Math.PI / 2;
    leftWing.name = "wing";
    group.add(leftWing);
    
    // 右翅膀
    const rightWing = new THREE.Mesh(wingGeometry, new THREE.MeshLambertMaterial({ color: 0x1E90FF }));
    rightWing.position.set(0.5, 0, 0.2);
    rightWing.rotation.z = -Math.PI / 2;
    rightWing.name = "wing";
    group.add(rightWing);
    
    // 腿和爪子
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 32);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    
    // 左腿
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.1, -0.4, 0.2);
    group.add(leftLeg);
    
    // 右腿
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.1, -0.4, 0.2);
    group.add(rightLeg);
    
    // 爪子
    const footGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 32);
    
    // 左爪
    const leftFoot1 = new THREE.Mesh(footGeometry, legMaterial);
    leftFoot1.position.set(-0.15, -0.6, 0.25);
    leftFoot1.rotation.z = -0.3;
    group.add(leftFoot1);
    
    const leftFoot2 = new THREE.Mesh(footGeometry, legMaterial);
    leftFoot2.position.set(-0.15, -0.6, 0.15);
    leftFoot2.rotation.z = 0.3;
    group.add(leftFoot2);
    
    // 右爪
    const rightFoot1 = new THREE.Mesh(footGeometry, legMaterial);
    rightFoot1.position.set(0.15, -0.6, 0.25);
    rightFoot1.rotation.z = 0.3;
    group.add(rightFoot1);
    
    const rightFoot2 = new THREE.Mesh(footGeometry, legMaterial);
    rightFoot2.position.set(0.15, -0.6, 0.15);
    rightFoot2.rotation.z = -0.3;
    group.add(rightFoot2);
    
    // 尾巴
    const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.7, 32),
        new THREE.MeshLambertMaterial({ color: 0x1E90FF })
    );
    tail.position.set(0, 0, -0.5);
    tail.rotation.x = Math.PI / 2;
    tail.name = "tail";
    group.add(tail);
    
    scene.add(group);
    currentPet = group;
    currentPetType = 'bird';
    
    // 如果之前在睡觉，恢复睡眠状态和特效
    if (petMemories.bird.isSleeping) {
        petMemories.bird.animationState = 'sleeping';
        addEffect('sleeping');
    }
    
    // 更新UI状态
    updateSleepStateUI();
}

// 创建小熊模型
function createBear() {
    clearAllEffects(); // 清除现有特效
    if (currentPet) scene.remove(currentPet);
    
    const group = new THREE.Group();
    group.name = "bear";
    group.position.set(0, 1, 0); // 确保在中心位置
    
    // 身体
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    body.position.y = 0;
    group.add(body);
    
    // 头部
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    head.position.y = 1.0;
    group.add(head);
    
    // 眼睛
    const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    
    const eyePupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    
    const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
    
    // 左眼
    const leftEye = eyeWhite.clone();
    leftEye.position.set(-0.25, 1.1, 0.5);
    group.add(leftEye);
    
    const leftPupil = eyePupil.clone();
    leftPupil.position.set(-0.28, 1.1, 0.55);
    group.add(leftPupil);
    
    // 左眼高光
    const leftShine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 32), shineMaterial);
    leftShine.position.set(-0.22, 1.15, 0.55);
    group.add(leftShine);
    
    // 右眼
    const rightEye = eyeWhite.clone();
    rightEye.position.set(0.25, 1.1, 0.5);
    group.add(rightEye);
    
    const rightPupil = eyePupil.clone();
    rightPupil.position.set(0.28, 1.1, 0.55);
    group.add(rightPupil);
    
    // 右眼高光
    const rightShine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 32), shineMaterial);
    rightShine.position.set(0.22, 1.15, 0.55);
    group.add(rightShine);
    
    // 鼻子
    const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    nose.position.set(0, 1.0, 0.6);
    group.add(nose);
    
    // 嘴巴
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.05, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 0.85, 0.55);
    group.add(mouth);
    
    // 圆耳朵
    const earGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    
    const leftEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    leftEar.position.set(-0.45, 1.4, 0);
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    rightEar.position.set(0.45, 1.4, 0);
    group.add(rightEar);
    
    // 手臂
    const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 32);
    
    const leftArm = new THREE.Mesh(armGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    leftArm.position.set(-0.7, 0, 0);
    leftArm.rotation.z = Math.PI / 2;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    rightArm.position.set(0.7, 0, 0);
    rightArm.rotation.z = -Math.PI / 2;
    group.add(rightArm);
    
    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.7, 32);
    
    const leftLeg = new THREE.Mesh(legGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    leftLeg.position.set(-0.3, -0.6, 0.3);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    rightLeg.position.set(0.3, -0.6, 0.3);
    group.add(rightLeg);
    
    // 小尾巴
    const tail = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    tail.position.set(0, -0.2, -0.8);
    tail.name = "tail";
    group.add(tail);
    
    // 围巾
    const scarf = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 0.8, 32),
        new THREE.MeshLambertMaterial({ color: 0xFF0000 })
    );
    scarf.position.set(0, 0.6, 0);
    scarf.rotation.x = Math.PI / 2;
    group.add(scarf);
    
    scene.add(group);
    currentPet = group;
    currentPetType = 'bear';
    
    // 如果之前在睡觉，恢复睡眠状态和特效
    if (petMemories.bear.isSleeping) {
        petMemories.bear.animationState = 'sleeping';
        addEffect('sleeping');
    }
    
    // 更新UI状态
    updateSleepStateUI();
}

// 创建小仓鼠模型
function createHamster() {
    clearAllEffects(); // 清除现有特效
    if (currentPet) scene.remove(currentPet);
    
    const group = new THREE.Group();
    group.name = "hamster";
    group.position.set(0, 1, 0); // 确保在中心位置
    
    // 身体 - 圆润的球形
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xF5DEB3 })
    );
    body.position.y = 0;
    group.add(body);
    
    // 头部
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xF5DEB3 })
    );
    head.position.y = 0.5;
    head.position.z = 0.5;
    group.add(head);
    
    // 眼睛 - 黑亮的小眼睛
    const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    
    const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
    
    // 左眼
    const leftEye = eye.clone();
    leftEye.position.set(-0.2, 0.6, 0.8);
    group.add(leftEye);
    group.add(leftEye);
    
    // 左眼高光
    const leftShine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 32), shineMaterial);
    leftShine.position.set(-0.18, 0.62, 0.82);
    group.add(leftShine);
    
    // 右眼
    const rightEye = eye.clone();
    rightEye.position.set(0.2, 0.6, 0.8);
    group.add(rightEye);
    
    // 右眼高光
    const rightShine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 32), shineMaterial);
    rightShine.position.set(0.18, 0.62, 0.82);
    group.add(rightShine);
    
    // 鼻子 - 小小的粉红色鼻子
    const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xFFB6C1 })
    );
    nose.position.set(0, 0.45, 0.9);
    group.add(nose);
    
    // 嘴巴
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.04, 0.04),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 0.38, 0.85);
    group.add(mouth);
    
    // 脸颊 - 仓鼠的标志性腮帮子
    const cheekGeometry = new THREE.SphereGeometry(0.22, 32, 32);
    
    const leftCheek = new THREE.Mesh(cheekGeometry, new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }));
    leftCheek.position.set(-0.35, 0.45, 0.7);
    group.add(leftCheek);
    
    const rightCheek = new THREE.Mesh(cheekGeometry, new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }));
    rightCheek.position.set(0.35, 0.45, 0.7);
    group.add(rightCheek);
    
    // 耳朵 - 小小的圆耳朵
    const earGeometry = new THREE.SphereGeometry(0.12, 32, 32);
    
    const leftEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0xE6C229 }));
    leftEar.position.set(-0.25, 0.8, 0.5);
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, new THREE.MeshLambertMaterial({ color: 0xE6C229 }));
    rightEar.position.set(0.25, 0.8, 0.5);
    group.add(rightEar);
    
    // 腿 - 短小可爱
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 32);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0xF5DEB3 });
    
    // 前腿
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.2, -0.5, 0.3);
    group.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.2, -0.5, 0.3);
    group.add(frontRightLeg);
    
    // 后腿
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.2, -0.5, -0.3);
    group.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.2, -0.5, -0.3);
    group.add(backRightLeg);
    
    // 尾巴 - 仓鼠几乎看不见的小尾巴
    const tail = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 32, 32),
        new THREE.MeshLambertMaterial({ color: 0xE6C229 })
    );
    tail.position.set(0, -0.2, -0.6);
    tail.name = "tail";
    group.add(tail);
    
    // 小爪子
    const pawGeometry = new THREE.SphereGeometry(0.08, 32, 32);
    const pawMaterial = new THREE.MeshLambertMaterial({ color: 0xE6C229 });
    
    // 前爪
    const frontLeftPaw = new THREE.Mesh(pawGeometry, pawMaterial);
    frontLeftPaw.position.set(-0.2, -0.7, 0.3);
    group.add(frontLeftPaw);
    
    const frontRightPaw = new THREE.Mesh(pawGeometry, pawMaterial);
    frontRightPaw.position.set(0.2, -0.7, 0.3);
    group.add(frontRightPaw);
    
    // 后爪
    const backLeftPaw = new THREE.Mesh(pawGeometry, pawMaterial);
    backLeftPaw.position.set(-0.2, -0.7, -0.3);
    group.add(backLeftPaw);
    
    const backRightPaw = new THREE.Mesh(pawGeometry, pawMaterial);
    backRightPaw.position.set(0.2, -0.7, -0.3);
    group.add(backRightPaw);
    
    scene.add(group);
    currentPet = group;
    currentPetType = 'hamster';
    
    // 如果之前在睡觉，恢复睡眠状态和特效
    if (petMemories.hamster.isSleeping) {
        petMemories.hamster.animationState = 'sleeping';
        addEffect('sleeping');
    }
    
    // 更新UI状态
    updateSleepStateUI();
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    if (currentPet) {
        // 获取当前宠物的动画状态
        const animationState = petMemories[currentPetType].animationState;
        
        // 根据当前动画状态执行不同动画
        switch(animationState) {
            case 'idle':
                // 轻微的上下浮动动画
                currentPet.position.y = 1 + 0.1 * Math.sin(Date.now() * 0.002);
                
                // 尾巴动画
                const tail = currentPet.getObjectByName("tail");
                if (tail) {
                    tail.rotation.z = 0.3 * Math.sin(Date.now() * 0.005);
                }
                
                // 鸟的翅膀动画
                if (currentPet.name === 'bird') {
                    // 为左右翅膀都添加动画
                    const leftWing = currentPet.getObjectByName("wing");
                    if (leftWing) {
                        leftWing.rotation.x = 0.3 * Math.sin(Date.now() * 0.01);
                    }
                    
                    const rightWing = currentPet.children.find(child => child.name === "wing" && child.position.x > 0);
                    if (rightWing) {
                        rightWing.rotation.x = -0.3 * Math.sin(Date.now() * 0.01);
                    }
                }
                
                // 仓鼠的特有动画 - 整理毛发
                if (currentPet.name === 'hamster' && Math.sin(Date.now() * 0.003) > 0.8) {
                    currentPet.rotation.z = 0.2 * Math.sin(Date.now() * 0.01);
                } else if (currentPet.name === 'hamster') {
                    currentPet.rotation.z = 0;
                }
                break;
                
            case 'petting':
                // 被抚摸时的动画
                currentPet.rotation.y = 0.3 * Math.sin(Date.now() * 0.01);
                currentPet.position.y = 1 + 0.2 * Math.sin(Date.now() * 0.01);
                break;
                
            case 'feeding':
                // 吃东西的动画
                currentPet.rotation.x = 0.2 * Math.sin(Date.now() * 0.02);
                
                // 仓鼠吃东西时腮帮子动
                if (currentPet.name === 'hamster') {
                    const leftCheek = currentPet.children.find(child => child.position.x < 0 && child.position.z > 0.5);
                    const rightCheek = currentPet.children.find(child => child.position.x > 0 && child.position.z > 0.5);
                    
                    if (leftCheek) leftCheek.scale.set(1 + 0.1 * Math.sin(Date.now() * 0.03), 1, 1);
                    if (rightCheek) rightCheek.scale.set(1 + 0.1 * Math.sin(Date.now() * 0.03 + Math.PI), 1, 1);
                }
                break;
                
            case 'playing':
                // 玩耍的动画
                currentPet.position.x = 0.5 * Math.sin(Date.now() * 0.008);
                currentPet.position.y = 1 + 0.3 * Math.sin(Date.now() * 0.005);
                currentPet.rotation.y = 0.5 * Math.sin(Date.now() * 0.008);
                
                // 仓鼠特有 - 快速抖动
                if (currentPet.name === 'hamster') {
                    currentPet.rotation.z = 0.4 * Math.sin(Date.now() * 0.02);
                }
                break;
                
            case 'cleaning':
                // 清洁的动画
                currentPet.rotation.z = 0.3 * Math.sin(Date.now() * 0.01);
                break;
                
            case 'sleeping':
                // 睡觉的动画 - 轻微呼吸效果
                currentPet.scale.x = 1.0 + 0.02 * Math.sin(Date.now() * 0.003);
                currentPet.scale.y = 1.0 + 0.02 * Math.sin(Date.now() * 0.003);
                currentPet.scale.z = 1.0 + 0.02 * Math.sin(Date.now() * 0.003);
                break;
        }
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// 显示想法气泡
function showThought(text) {
    hideThought(); // 显示新气泡前，先清除旧气泡和定时器
    const thoughtBubble = document.getElementById('thought-bubble');
    thoughtBubble.textContent = text;
    thoughtBubble.style.left = '50%';
    thoughtBubble.style.top = '30%';
    thoughtBubble.style.transform = 'translate(-50%, -50%)';
    thoughtBubble.style.opacity = 1;
    
    // 用全局变量存储定时器，方便后续清除
    thoughtTimeout = setTimeout(() => {
        thoughtBubble.style.opacity = 0;
        thoughtTimeout = null; // 定时器执行后重置
    }, 2000);
}

// 强制隐藏气泡并清除定时器
function hideThought() {
    const thoughtBubble = document.getElementById('thought-bubble');
    if (thoughtBubble) {
        thoughtBubble.style.opacity = 0; // 立即隐藏气泡
    }
    if (thoughtTimeout) {
        clearTimeout(thoughtTimeout); // 清除旧的延迟消失定时器
        thoughtTimeout = null; // 重置定时器变量
    }
}

// 获取AI生成的清醒回复
function getAIResponseForWakeUp() {
    const petMemory = petMemories[currentPetType];
    
    // 显示加载状态
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';
    
    try {
        // 根据宠物性格生成系统提示
        const personality = petPersonalities[currentPetType].personality;
        const systemPrompt = `你是一只${petPersonalities[currentPetType].name}，性格${personality}。你刚刚从睡梦中醒来，用符合你性格的语气回应主人，表达刚睡醒的状态和心情，使用一些颜文字表达情感。`;
        
        // 准备发送给API的消息
        const messages = [
            {role: "system", content: systemPrompt},
            ...petMemory.conversation.slice(-100), // 只取最近的100条对话作为上下文
            {role: "user", content: "主人把你叫醒了"}
        ];
        
        // 调用API
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "THUDM/glm-4-9b-chat",
                messages: messages,
                max_tokens: 4096,
                enable_thinking: false,
                thinking_budget: 4096,
                min_p: 0.05,
                temperature: 0.7,
                top_p: 0.7,
                top_k: 50,
                frequency_penalty: 0.5,
                n: 1
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let petMessage = data.choices[0].message.content;
            
            // 保存对话到记忆
            petMemory.conversation.push(
                {role: "user", content: "主人把你叫醒了"},
                {role: "assistant", content: petMessage}
            );

            // 管理对话历史
            petMemory.conversation = manageConversationHistory(petMemory.conversation);
            
            // 添加宠物回复到聊天窗口
            addMessage(petMessage, 'pet');
            
            // 宠物回复时做一些动画
            if (currentPet && petMemory.animationState !== 'sleeping') {
                const originalY = currentPet.position.y;
                currentPet.position.y = originalY + 0.3;
                
                setTimeout(() => {
                    currentPet.position.y = originalY;
                }, 300);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage('唔...刚睡醒有点迷糊呢~ (～﹃～)~zZ', 'pet');
        })
        .finally(() => {
            loadingElement.style.display = 'none';
        });
    } catch (error) {
        console.error('Error:', error);
        addMessage('唔...刚睡醒有点迷糊呢~ (～﹃～)~zZ', 'pet');
        loadingElement.style.display = 'none';
    }
}

// 执行互动动作 - 修改为调用AI生成回复
function performInteraction(action) {
    hideThought();
    // 获取当前宠物的记忆
    const petMemory = petMemories[currentPetType];
    
    // 处理睡觉状态的切换
    if (action === 'sleeping') {
        // 强制同步状态检查
        const isCurrentlySleeping = petMemory.animationState === 'sleeping' || petMemory.isSleeping;
        
        if (isCurrentlySleeping) {
            // 强制重置所有睡眠状态
            petMemory.animationState = 'idle';
            petMemory.isSleeping = false;
            
            // 彻底清除所有相关定时器和特效
            if (sleepEffectIntervals[currentPetType]) {
                clearInterval(sleepEffectIntervals[currentPetType]);
                sleepEffectIntervals[currentPetType] = null;
                delete sleepEffectIntervals[currentPetType];
            }
            clearAllEffects();
            
            // 立即更新UI状态
            updateSleepStateUI();
            
            // 调用AI生成清醒回复
            getAIResponseForWakeUp();
            
            return;
        } else {
    // 进入睡眠状态前先更新状态
    petMemory.animationState = 'sleeping';
    petMemory.isSleeping = true;
    updateSleepStateUI();
    
    // 调用AI生成睡觉回应
    const personality = petPersonalities[currentPetType].personality;
    const systemPrompt = `你是一只${petPersonalities[currentPetType].name}，性格${personality}。你现在想睡觉了，用符合你性格的语气告诉主人你要休息了，使用一些颜文字表达疲惫或想睡觉的状态。`;
    
    // 准备发送给API的消息
    const messages = [
        {role: "system", content: systemPrompt},
        ...petMemory.conversation.slice(-100),
        {role: "user", content: "现在该睡觉了"}
    ];
    
    // 显示加载状态
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';
    
    // 调用API
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "THUDM/glm-4-9b-chat",
            messages: messages,
            max_tokens: 4096,
            enable_thinking: false,
            temperature: 0.7
        })
    })
    .then(response => response.json())
    .then(data => {
        let petMessage = data.choices[0].message.content;
        addMessage(petMessage, 'pet');
        
        // 保存对话到记忆
        petMemory.conversation.push(
            {role: "user", content: "现在该睡觉了"},
            {role: "assistant", content: petMessage}
        );
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage('好困啊...我要去睡觉了...', 'pet');
    })
    .finally(() => {
        loadingElement.style.display = 'none';
    });
	return;
}

    }
    
    // 如果动物正在睡觉，不执行其他互动
    if (petMemory.animationState === 'sleeping' && action !== 'sleeping') {
        // 调用AI生成被吵醒的回应
        const personality = petPersonalities[currentPetType].personality;
        const systemPrompt = `你是一只${petPersonalities[currentPetType].name}，性格${personality}。你正在睡觉，突然被主人吵醒了，用符合你性格的语气回应，使用一些颜文字表达被吵醒的心情。`;
        
        // 准备发送给API的消息
        const messages = [
            {role: "system", content: systemPrompt},
            ...petMemory.conversation.slice(-100),
            {role: "user", content: "主人在你睡觉时打扰了你"}
        ];
        
        // 显示加载状态
        const loadingElement = document.getElementById('loading');
        loadingElement.style.display = 'block';
        
        // 调用API
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "THUDM/glm-4-9b-chat",
                messages: messages,
                max_tokens: 4096,
                enable_thinking: false,
                temperature: 0.7
            })
        })
        .then(response => response.json())
        .then(data => {
            let petMessage = data.choices[0].message.content;
            addMessage(petMessage, 'pet');
            
            // 保存对话到记忆
            petMemory.conversation.push(
                {role: "user", content: "主人在你睡觉时打扰了你"},
                {role: "assistant", content: petMessage}
            );
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage('嗯？什么事呀？(半梦半醒中)', 'pet');
        })
        .finally(() => {
            loadingElement.style.display = 'none';
        });
        return;
    }
    
    // 清除之前的超时
    if (interactionTimeout) {
        clearTimeout(interactionTimeout);
    }
    
    // 添加对应特效
    addEffect(action);
    
    // 停止当前动画，开始新动画
    let wasSleeping = petMemory.animationState === 'sleeping';
    petMemory.animationState = action;
    
    // 如果是睡觉动作，更新UI
    if (action === 'sleeping') {
        updateSleepStateUI();
    }
    
    // 准备互动描述，用于AI生成回复
    const actionDescriptions = {
        petting: "主人正在抚摸我",
        feeding: "主人正在喂我吃东西",
        playing: "主人正在和我一起玩",
        cleaning: "主人正在给我清洁",
        sleeping: "我现在想睡觉了"
    };
    
    // 如果之前在睡觉，添加被吵醒的回应
    if (wasSleeping) {
        // 调用AI生成被吵醒的回应
        const personality = petPersonalities[currentPetType].personality;
        const systemPrompt = `你是一只${petPersonalities[currentPetType].name}，性格${personality}。你正在睡觉，突然被主人吵醒了，用符合你性格的语气回应，使用一些颜文字表达被吵醒的心情。`;
        
        // 准备发送给API的消息
        const messages = [
            {role: "system", content: systemPrompt},
            ...petMemory.conversation.slice(-100),
            {role: "user", content: "主人在你睡觉时打扰了你"}
        ];
        
        // 显示加载状态
        const loadingElement = document.getElementById('loading');
        loadingElement.style.display = 'block';
        
        // 延迟获取AI回应，使对话更自然（保留原有的800ms延迟）
        setTimeout(() => {
            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "THUDM/glm-4-9b-chat",
                    messages: messages,
                    max_tokens: 4096,
                    enable_thinking: false,
                    temperature: 0.7
                })
            })
            .then(response => response.json())
            .then(data => {
                let petMessage = data.choices[0].message.content;
                addMessage(petMessage, 'pet');
                
                // 保存对话到记忆
                petMemory.conversation.push(
                    {role: "user", content: "主人在你睡觉时打扰了你"},
                    {role: "assistant", content: petMessage}
                );
                
                // 继续获取当前动作的AI回应
                getAIResponseForInteraction(actionDescriptions[action]);
            })
            .catch(error => {
                console.error('Error:', error);
                addMessage('嗯？什么事呀？(半梦半醒中)', 'pet');
                // 即使出错，仍继续处理当前动作
                getAIResponseForInteraction(actionDescriptions[action]);
            })
            .finally(() => {
                loadingElement.style.display = 'none';
            });
        }, 800);
    } else {
        // 直接获取AI回应
        getAIResponseForInteraction(actionDescriptions[action]);
    }
    
    // 显示想法气泡
    if (action === 'feeding') {
        showThought("好吃！");
    } else if (action === 'playing') {
        showThought("好玩！");
    }
    
    // 除了睡觉状态，其他动作只持续1.5秒
    if (action !== 'sleeping') {
        interactionTimeout = setTimeout(() => {
            if (petMemory.animationState === action) { // 确保没有被其他动画覆盖
                petMemory.animationState = 'idle';
            }
        }, 1500);
    }
}

// 获取AI对互动的回应
function getAIResponseForInteraction(interactionDescription) {
    const petMemory = petMemories[currentPetType];
    
    // 显示加载状态
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';
    
    try {
        // 简化消息用于查重
        const simplifiedMessage = interactionDescription.toLowerCase().trim()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, ' ');
        
        // 根据宠物性格生成系统提示
        const personality = petPersonalities[currentPetType].personality;
        const systemPrompt = `你是一只${petPersonalities[currentPetType].name}，性格${personality}。现在${interactionDescription}，用符合你性格的语气回应，使用一些颜文字表达情感。`;
        
        // 准备发送给API的消息
        const messages = [
            {role: "system", content: systemPrompt},
            ...petMemory.conversation.slice(-100), // 只取最近的100条对话作为上下文
            {role: "user", content: interactionDescription}
        ];
        
        // 调用API
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "THUDM/glm-4-9b-chat",
                messages: messages,
                max_tokens: 4096,
                enable_thinking: false,
                thinking_budget: 4096,
                min_p: 0.05,
                temperature: 0.7,
                top_p: 0.7,
                top_k: 50,
                frequency_penalty: 0.5,
                n: 1
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let petMessage = data.choices[0].message.content;
            
            // 保存对话到记忆
            petMemory.conversation.push(
                {role: "user", content: interactionDescription},
                {role: "assistant", content: petMessage}
            );

            // 管理对话历史
            petMemory.conversation = manageConversationHistory(petMemory.conversation);
            
            // 添加宠物回复到聊天窗口
            addMessage(petMessage, 'pet');
            
            // 宠物回复时做一些动画
            if (currentPet && petMemory.animationState !== 'sleeping') {
                const originalY = currentPet.position.y;
                currentPet.position.y = originalY + 0.3;
                
                setTimeout(() => {
                    currentPet.position.y = originalY;
                }, 300);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage('抱歉，我现在有点累了，稍后再和我互动吧~ (╥﹏╥)', 'pet');
        })
        .finally(() => {
            loadingElement.style.display = 'none';
        });
    } catch (error) {
        console.error('Error:', error);
        addMessage('抱歉，我现在有点累了，稍后再和我互动吧~ (╥﹏╥)', 'pet');
        loadingElement.style.display = 'none';
    }
}

// 更新睡眠状态UI
function updateSleepStateUI() {
    const petMemory = petMemories[currentPetType];
    const isSleeping = petMemory.animationState === 'sleeping';
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const sleepingNotice = document.getElementById('sleeping-notice');
    const petContainer = document.getElementById('pet-container');
    const chatContainer = document.getElementById('chat-container');
    const sleepButton = document.getElementById('sleep-btn');
    const sleepButtonText = sleepButton.querySelector('span');
    const sleepButtonIcon = sleepButton.querySelector('i');
    
    // 更新输入框状态
    messageInput.disabled = isSleeping;
    sendButton.disabled = isSleeping;
    
    // 更新其他互动按钮状态
    document.getElementById('pet-btn').disabled = isSleeping;
    document.getElementById('feed-btn').disabled = isSleeping;
    document.getElementById('play-btn').disabled = isSleeping;
    document.getElementById('clean-btn').disabled = isSleeping;
    
    // 更新睡觉/清醒按钮
    if (isSleeping) {
        sleepButtonText.textContent = '清醒';
        sleepButtonIcon.className = 'fas fa-sun';
        sleepButton.style.background = '#FFA500'; // 橙色表示清醒
    } else {
        sleepButtonText.textContent = '睡觉';
        sleepButtonIcon.className = 'fas fa-moon';
        sleepButton.style.background = '#ba55d3'; // 恢复原来的颜色
    }
    
    // 显示/隐藏睡觉提示
    sleepingNotice.style.display = isSleeping ? 'block' : 'none';
    
    // 更新容器大小
    if (isSleeping) {
        petContainer.classList.add('expanded');
        chatContainer.classList.add('contracted');
    } else {
        petContainer.classList.remove('expanded');
        chatContainer.classList.remove('contracted');
    }
    
    // 确保聊天框尺寸正确
    checkScrollbar();
}

// 添加互动特效
function addEffect(type) {
    const effectContainer = document.getElementById('effect-container');
    const rect = effectContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // 清除现有特效（睡眠特效除外）
    if (type !== 'sleeping') {
        while (effectContainer.firstChild) {
            effectContainer.removeChild(effectContainer.firstChild);
        }
    }
    
    // 根据互动类型创建不同特效
    if (type === 'petting') {
        // 爱心特效
        for (let i = 0; i < 8; i++) {
            const heart = document.createElement('div');
            heart.innerHTML = '<i class="fas fa-heart"></i>';
            heart.className = 'effect';
            heart.style.color = `rgb(255, ${100 + Math.random() * 155}, ${100 + Math.random() * 155})`;
            heart.style.fontSize = `${16 + Math.random() * 16}px`;
            heart.style.left = `${centerX + (Math.random() - 0.5) * 100}px`;
            heart.style.top = `${centerY - 50 + (Math.random() - 0.5) * 50}px`;
            heart.style.animation = 'floatEffect 1.5s forwards';
            heart.style.animationDelay = `${i * 0.1}s`;
            effectContainer.appendChild(heart);
        }
    }
    else if (type === 'feeding') {
        // 食物特效
        const foods = ['🍖', '🍎', '🥕', '🍗', '🍒', '🌰', '🌾'];
        for (let i = 0; i < 5; i++) {
            const food = document.createElement('div');
            food.textContent = foods[Math.floor(Math.random() * foods.length)];
            food.className = 'effect';
            food.style.fontSize = `${24 + Math.random() * 12}px`;
            food.style.left = `${centerX + (Math.random() - 0.5) * 80}px`;
            food.style.top = `${centerY - 100 + i * 20}px`;
            food.style.animation = 'fallingEffect 1.5s forwards';
            effectContainer.appendChild(food);
        }
    } 
    else if (type === 'playing') {
        // 玩具特效
        const toys = ['🎾', '🔴', '🎈', '⚽', '🎀', '🏀', '⚪'];
        for (let i = 0; i < 5; i++) {
            const toy = document.createElement('div');
            toy.textContent = toys[Math.floor(Math.random() * toys.length)];
            toy.className = 'effect';
            toy.style.fontSize = `${24 + Math.random() * 12}px`;
            toy.style.left = `${centerX + (Math.random() - 0.5) * 150}px`;
            toy.style.top = `${centerY + (Math.random() - 0.5) * 100}px`;
            toy.style.animation = 'bounceEffect 1.5s forwards';
            effectContainer.appendChild(toy);
        }
    } 
    else if (type === 'cleaning') {
        // 水滴/泡沫特效
        for (let i = 0; i < 10; i++) {
            const bubble = document.createElement('div');
            bubble.innerHTML = i % 3 === 0 ? '<i class="fas fa-tint"></i>' : '<i class="fas fa-spa"></i>';
            bubble.className = 'effect';
            bubble.style.color = i % 3 === 0 ? '#1E90FF' : '#E0FFFF';
            bubble.style.fontSize = `${16 + Math.random() * 16}px`;
            bubble.style.left = `${centerX + (Math.random() - 0.5) * 120}px`;
            bubble.style.top = `${centerY + (Math.random() - 0.5) * 80}px`;
            bubble.style.animation = 'floatEffect 1.5s forwards';
            bubble.style.animationDelay = `${i * 0.1}s`;
            effectContainer.appendChild(bubble);
        }
    } 
    else if (type === 'sleeping') {
        // 清除现有特效和定时器
        clearInterval(sleepEffectIntervals[currentPetType]);
        while (effectContainer.firstChild) {
            effectContainer.removeChild(effectContainer.firstChild);
        }
        
        // 添加睡眠光环（持续动画）
        const aura = document.createElement('div');
        aura.innerHTML = '<i class="fas fa-circle"></i>';
        aura.className = 'effect';
        aura.style.color = 'rgba(255, 255, 255, 0.6)';
        aura.style.fontSize = '200px';
        aura.style.left = `${centerX - 100}px`;
        aura.style.top = `${centerY - 100}px`;
        aura.style.animation = 'pulseEffect 3s infinite';
        effectContainer.appendChild(aura);
        
        // 创建持续的睡眠特效循环
        sleepEffectIntervals[currentPetType] = setInterval(() => {
            // 只在当前宠物仍处于睡眠状态时添加特效
            if (petMemories[currentPetType].animationState === 'sleeping') {
                for (let i = 0; i < 3; i++) {
                    const zzz = document.createElement('div');
                    zzz.textContent = 'z';
                    zzz.className = 'effect';
                    zzz.style.fontSize = `${20 + i * 10}px`;
                    zzz.style.color = '#666';
                    zzz.style.left = `${centerX + 30 + i * 20}px`;
                    zzz.style.top = `${centerY - 80 - i * 20}px`;
                    zzz.style.animation = 'sleepEffect 3s forwards';
                    zzz.style.animationDelay = `${i * 0.5}s`;
                    effectContainer.appendChild(zzz);
                    
                    // 3秒后移除元素，避免DOM堆积
                    setTimeout(() => {
                        if (zzz.parentNode === effectContainer) {
                            effectContainer.removeChild(zzz);
                        }
                    }, 3000);
                }
            }
        }, 3000); // 每3秒添加一次z字特效
    }
}

// 与API聊天
async function chatWithPet(message) {
    // 检查当前宠物是否在睡觉
    const petMemory = petMemories[currentPetType];
    if (petMemory.animationState === 'sleeping') {
        return; // 如果在睡觉，不发送消息
    }
    
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';
    
    try {
        // 简化消息用于查重
        const simplifiedMessage = message.toLowerCase().trim()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, ' ');
        
        // 根据宠物性格生成系统提示
        const personality = petPersonalities[currentPetType].personality;
        const systemPrompt = `你是一只${petPersonalities[currentPetType].name}，性格${personality}。用符合你性格的语气回答用户，不需要刻意保持简短，可以根据问题的复杂性自由表达。回答要充满情感并使用一些颜文字。`;
        
        // 准备发送给API的消息，包括历史对话
        const messages = [
            {role: "system", content: systemPrompt},
            ...petMemory.conversation,
            {role: "user", content: message}
        ];
        
        // 调用API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "THUDM/glm-4-9b-chat",
                messages: messages,
                max_tokens: 4096,
                enable_thinking: false,
                thinking_budget: 4096,
                min_p: 0.05,
                temperature: 0.7,
                top_p: 0.7,
                top_k: 50,
                frequency_penalty: 0.5,
                n: 1
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('API 响应状态:', response.status, response.statusText);
            console.error('API 响应内容:', data);
            const errorMsg = `状态码: ${response.status}, 信息: ${data.error?.message || data.message || '未知错误'}`;
            throw new Error(`API 请求失败: ${errorMsg}`);
        }
        
        let petMessage = data.choices[0].message.content;
        
        // 保存对话到记忆
        petMemory.conversation.push(
            {role: "user", content: message},
            {role: "assistant", content: petMessage}
        );

        // 管理对话历史
        petMemory.conversation = manageConversationHistory(petMemory.conversation);
        
        // 添加宠物回复到聊天窗口
        addMessage(petMessage, 'pet');
        
        // 宠物回复时做一些动画
        if (currentPet && petMemory.animationState !== 'sleeping') {
            const originalY = currentPet.position.y;
            currentPet.position.y = originalY + 0.3;
            
            setTimeout(() => {
                currentPet.position.y = originalY;
            }, 300);
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('抱歉，我现在有点累了，稍后再和我聊天吧~ (╥﹏╥)', 'pet');
    } finally {
        loadingElement.style.display = 'none';
    }
}

function manageConversationHistory(conversation) {
    // 计算当前历史对话的总token数
    const totalTokens = calculateTokens(conversation);
    const MAX_CONTEXT_TOKENS = 128000; // 模型最大上下文128K
    const RESERVE_TOKENS = 4096; // 预留回复空间
    
    // 如果历史token超过安全阈值，截断
    if (totalTokens > MAX_CONTEXT_TOKENS - RESERVE_TOKENS) {
        // 从最早的消息开始删除，直到符合条件
        while (totalTokens > MAX_CONTEXT_TOKENS - RESERVE_TOKENS && conversation.length > 0) {
            const removedMessage = conversation.shift();
            totalTokens -= calculateTokens([removedMessage]);
        }
    }
    
    // 保存完整历史到localStorage
    localStorage.setItem(`fullPetHistory_${currentPetType}`, JSON.stringify(conversation));
    return conversation;
}

// Token计算工具
function calculateTokens(messages) {
    // 粗略估算：中文≈字符数×2 token，英文≈字符数×1 token
    let total = 0;
    messages.forEach(msg => {
        const content = msg.content || '';
        const chineseChars = content.match(/[\u4e00-\u9fa5]/g)?.length || 0;
        const otherChars = content.length - chineseChars;
        total += chineseChars * 2 + otherChars * 1;
    });
    return total;
}

// 发送消息
function sendMessage() {
    const userInput = document.getElementById('message-input').value;
    if (!userInput.trim()) return;

    // 获取当前宠物的记忆
    const petMemory = petMemories[currentPetType];
    // 添加用户消息到历史
    petMemory.conversation.push({ role: 'user', content: userInput });
    
    // 管理对话历史
    petMemory.conversation = manageConversationHistory(petMemory.conversation);
    
    // 调用AI聊天接口
    chatWithPet(userInput);
    document.getElementById('message-input').value = '';
}

// 添加消息到聊天窗口
function addMessage(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(sender === 'user' ? 'user-message' : 'pet-message');
    messageElement.textContent = message;
    
    // 将消息添加到当前宠物的记忆中
    const petMemory = petMemories[currentPetType];
    petMemory.messageElements.push(messageElement);
    
    // 添加到DOM
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 确保滚动条正确显示
    checkScrollbar();
}

// 切换聊天记录到指定宠物
function switchChatHistory(petType) {
    const chatMessages = document.getElementById('chat-messages');
    const petMemory = petMemories[petType];
    
    // 清空当前聊天窗口
    while (chatMessages.firstChild) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
    
    // 添加该宠物的所有消息
    petMemory.messageElements.forEach(element => {
        chatMessages.appendChild(element);
    });
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 更新标题中的宠物名称
    document.getElementById('current-pet-name').textContent = petPersonalities[petType].name;
    
    // 确保滚动条正确显示
    checkScrollbar();
    
    // 更新睡眠状态UI
    updateSleepStateUI();
}

// 初始化
window.onload = function() {
    init();
    
    // 添加事件监听器
    document.getElementById('send-button').addEventListener('click', function() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (message) {
            addMessage(message, 'user');
            input.value = '';
            chatWithPet(message);
        }
    });
    
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('send-button').click();
        }
    });
    
    // 互动按钮事件
    document.getElementById('pet-btn').addEventListener('click', function() {
        performInteraction('petting');
    });
    
    document.getElementById('feed-btn').addEventListener('click', function() {
        performInteraction('feeding');
    });
    
    document.getElementById('play-btn').addEventListener('click', function() {
        performInteraction('playing');
    });
    
    document.getElementById('clean-btn').addEventListener('click', function() {
        performInteraction('cleaning');
    });
    
    document.getElementById('sleep-btn').addEventListener('click', function() {
        performInteraction('sleeping');
    });
    
    // 动物切换按钮
    const animalBtns = document.querySelectorAll('.animal-btn');
    animalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 检查是否正在思考中
            if (document.getElementById('loading').style.display === 'block') {
                // 获取当前显示的动物名称
                const currentPetName = petPersonalities[currentPetType].name;
                // 显示自定义提示框
                const alertElement = document.getElementById('customAlert');
                const messageElement = document.getElementById('alertMessage');
                messageElement.textContent = `${currentPetName}正在忙着回应你哦~`;
                alertElement.style.display = 'block';
                return; // 如果正在思考，不改变按钮状态
            }
            
            // 移除所有按钮的active类
            animalBtns.forEach(b => b.classList.remove('active'));
            // 给当前点击的按钮添加active类
            this.classList.add('active');
        });
    });
    
    document.getElementById('dog-btn').addEventListener('click', function() {
		// 检查加载状态
		    if (document.getElementById('loading').style.display === 'block') {
		        const currentPetName = petPersonalities[currentPetType].name;
		        // 显示自定义提示框
		        const alertElement = document.getElementById('customAlert');
		        const messageElement = document.getElementById('alertMessage');
		        messageElement.textContent = `${currentPetName}正在忙着回应你哦~`;
		        alertElement.style.display = 'block';
		        return;
		    }
        createDog();
        hideThought();
        // 如果是第一次切换到该宠物，添加欢迎消息
        if (petMemories.dog.conversation.length === 0) {
            const greeting = petPersonalities.dog.greeting;
            petMemories.dog.conversation.push({role: "assistant", content: greeting});
            
            const msgElement = document.createElement('div');
            msgElement.classList.add('message', 'pet-message');
            msgElement.textContent = greeting;
            petMemories.dog.messageElements.push(msgElement);
        }
        switchChatHistory('dog');
        petMemories.dog.animationState = 'idle';
    });
    
    document.getElementById('cat-btn').addEventListener('click', function() {
		// 检查加载状态
		    if (document.getElementById('loading').style.display === 'block') {
		        const currentPetName = petPersonalities[currentPetType].name;
		        // 显示自定义提示框
		        const alertElement = document.getElementById('customAlert');
		        const messageElement = document.getElementById('alertMessage');
		        messageElement.textContent = `${currentPetName}正在忙着回应你哦~`;
		        alertElement.style.display = 'block';
		        return;
		    }
        createCat();
        hideThought();
        // 如果是第一次切换到该宠物，添加欢迎消息
        if (petMemories.cat.conversation.length === 0) {
            const greeting = petPersonalities.cat.greeting;
            petMemories.cat.conversation.push({role: "assistant", content: greeting});
            
            const msgElement = document.createElement('div');
            msgElement.classList.add('message', 'pet-message');
            msgElement.textContent = greeting;
            petMemories.cat.messageElements.push(msgElement);
        }
        switchChatHistory('cat');
        petMemories.cat.animationState = 'idle';
    });
    
    document.getElementById('rabbit-btn').addEventListener('click', function() {
		// 检查加载状态
		    if (document.getElementById('loading').style.display === 'block') {
		        const currentPetName = petPersonalities[currentPetType].name;
		        // 显示自定义提示框
		        const alertElement = document.getElementById('customAlert');
		        const messageElement = document.getElementById('alertMessage');
		        messageElement.textContent = `${currentPetName}正在忙着回应你哦~`;
		        alertElement.style.display = 'block';
		        return;
		    }
        createRabbit();
        hideThought();
        // 如果是第一次切换到该宠物，添加欢迎消息
        if (petMemories.rabbit.conversation.length === 0) {
            const greeting = petPersonalities.rabbit.greeting;
            petMemories.rabbit.conversation.push({role: "assistant", content: greeting});
            
            const msgElement = document.createElement('div');
            msgElement.classList.add('message', 'pet-message');
            msgElement.textContent = greeting;
            petMemories.rabbit.messageElements.push(msgElement);
        }
        switchChatHistory('rabbit');
        petMemories.rabbit.animationState = 'idle';
    });
    
    document.getElementById('bird-btn').addEventListener('click', function() {
		// 检查加载状态
		    if (document.getElementById('loading').style.display === 'block') {
		        const currentPetName = petPersonalities[currentPetType].name;
		        // 显示自定义提示框
		        const alertElement = document.getElementById('customAlert');
		        const messageElement = document.getElementById('alertMessage');
		        messageElement.textContent = `${currentPetName}正在忙着回应你哦~`;
		        alertElement.style.display = 'block';
		        return;
		    }
        createBird();
        hideThought();
        // 如果是第一次切换到该宠物，添加欢迎消息
        if (petMemories.bird.conversation.length === 0) {
            const greeting = petPersonalities.bird.greeting;
            petMemories.bird.conversation.push({role: "assistant", content: greeting});
            
            const msgElement = document.createElement('div');
            msgElement.classList.add('message', 'pet-message');
            msgElement.textContent = greeting;
            petMemories.bird.messageElements.push(msgElement);
        }
        switchChatHistory('bird');
        petMemories.bird.animationState = 'idle';
    });
    
    document.getElementById('bear-btn').addEventListener('click', function() {
		// 检查加载状态
		    if (document.getElementById('loading').style.display === 'block') {
		        const currentPetName = petPersonalities[currentPetType].name;
		        // 显示自定义提示框
		        const alertElement = document.getElementById('customAlert');
		        const messageElement = document.getElementById('alertMessage');
		        messageElement.textContent = `${currentPetName}正在忙着回应你哦~`;
		        alertElement.style.display = 'block';
		        return;
		    }
        createBear();
        hideThought();
        // 如果是第一次切换到该宠物，添加欢迎消息
        if (petMemories.bear.conversation.length === 0) {
            const greeting = petPersonalities.bear.greeting;
            petMemories.bear.conversation.push({role: "assistant", content: greeting});
            
            const msgElement = document.createElement('div');
            msgElement.classList.add('message', 'pet-message');
            msgElement.textContent = greeting;
            petMemories.bear.messageElements.push(msgElement);
        }
        switchChatHistory('bear');
        petMemories.bear.animationState = 'idle';
    });
    
    document.getElementById('hamster-btn').addEventListener('click', function() {
		// 检查加载状态
		    if (document.getElementById('loading').style.display === 'block') {
		        const currentPetName = petPersonalities[currentPetType].name;
		        // 显示自定义提示框
		        const alertElement = document.getElementById('customAlert');
		        const messageElement = document.getElementById('alertMessage');
		        messageElement.textContent = `${currentPetName}正在忙着回应你哦~`;
		        alertElement.style.display = 'block';
		        return;
		    }
        createHamster();
        hideThought();
        // 如果是第一次切换到该宠物，添加欢迎消息
        if (petMemories.hamster.conversation.length === 0) {
            const greeting = petPersonalities.hamster.greeting;
            petMemories.hamster.conversation.push({role: "assistant", content: greeting});
            
            const msgElement = document.createElement('div');
            msgElement.classList.add('message', 'pet-message');
            msgElement.textContent = greeting;
            petMemories.hamster.messageElements.push(msgElement);
        }
        switchChatHistory('hamster');
        petMemories.hamster.animationState = 'idle';
    });
};
