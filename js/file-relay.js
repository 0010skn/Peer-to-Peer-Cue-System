(function () {
  const serverId = document.getElementById("serverId");
  const connectionStatus = document.getElementById("connectionStatus");
  const filesTable = document.getElementById("filesTable");
  const maxFileSizeInput = document.getElementById("maxFileSize");
  const expirationDaysInput = document.getElementById("expirationDays");
  const saveSettingsButton = document.getElementById("saveSettings");

  let peer;

  let settings = {
    maxFileSize: 100, // MB
    expirationDays: 7,
    enableVIP: false,
    enableGuestUpload: true,
    enableGuestDownload: true,
    guestDailyDownloadLimit: 10,
    vipSettings: {
      uploadEnabled: true,
      downloadEnabled: true,
      dailyDownloadLimit: 0,
      maxFileSize: 1024,
      expirationDays: 30,
    },
  };

  // 添加加载设置函数
  function loadSettings() {
    const savedSettings = localStorage.getItem("settings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      settings = { ...settings, ...parsedSettings };

      // 更新UI
      document.getElementById("maxFileSize").value = settings.maxFileSize;
      document.getElementById("expirationDays").value =
        settings.expirationDays;
      document.getElementById("enableGuestUpload").checked =
        settings.enableGuestUpload;
      document.getElementById("enableGuestDownload").checked =
        settings.enableGuestDownload;
      document.getElementById("guestDailyDownloadLimit").value =
        settings.guestDailyDownloadLimit;
      document.getElementById("enableVIP").checked = settings.enableVIP;

      // 更新VIP设置
      document.getElementById("vipUploadEnabled").checked =
        settings.vipSettings.uploadEnabled;
      document.getElementById("vipDownloadEnabled").checked =
        settings.vipSettings.downloadEnabled;
      document.getElementById("vipDailyDownloadLimit").value =
        settings.vipSettings.dailyDownloadLimit;
      document.getElementById("vipMaxFileSize").value =
        settings.vipSettings.maxFileSize;
      document.getElementById("vipExpirationDays").value =
        settings.vipSettings.expirationDays;
    }
  }

  // 添加保存设置函数
  function saveSettings() {
    settings.maxFileSize = parseInt(
      document.getElementById("maxFileSize").value
    );
    settings.expirationDays = parseInt(
      document.getElementById("expirationDays").value
    );
    settings.enableGuestUpload =
      document.getElementById("enableGuestUpload").checked;
    settings.enableGuestDownload = document.getElementById(
      "enableGuestDownload"
    ).checked;
    settings.guestDailyDownloadLimit = parseInt(
      document.getElementById("guestDailyDownloadLimit").value
    );
    settings.enableVIP = document.getElementById("enableVIP").checked;

    settings.vipSettings.uploadEnabled =
      document.getElementById("vipUploadEnabled").checked;
    settings.vipSettings.downloadEnabled =
      document.getElementById("vipDownloadEnabled").checked;
    settings.vipSettings.dailyDownloadLimit = parseInt(
      document.getElementById("vipDailyDownloadLimit").value
    );
    settings.vipSettings.maxFileSize = parseInt(
      document.getElementById("vipMaxFileSize").value
    );
    settings.vipSettings.expirationDays = parseInt(
      document.getElementById("vipExpirationDays").value
    );

    localStorage.setItem("settings", JSON.stringify(settings));
    showMessage("设置已保存", "success");
  }

  // 添加检查设置更新函数
  function checkSettings() {
    const savedSettings = localStorage.getItem("settings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      if (JSON.stringify(settings) !== JSON.stringify(parsedSettings)) {
        loadSettings();
      }
    }
  }

  // 添加显示上传文件函数
  async function displayUploadedFiles() {
    const tbody = document.querySelector("#filesTable tbody");
    tbody.innerHTML = "";

    try {
        const db = await dbUtils.openDatabase();
        const transaction = db.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const request = store.getAll();

        request.onsuccess = function() {
            const files = request.result;
            if (!files || files.length === 0) {
                return;
            }

            files.forEach((file) => {
                const tr = document.createElement("tr");
                const uploadDate = new Date(file.uploadTime);
                const expirationDate = new Date(file.expirationTime);

                tr.innerHTML = `
                    <td>${file.name}</td>
                    <td>${formatFileSize(file.size)}</td>
                    <td>${file.pickupCode}</td>
                    <td>${uploadDate.toLocaleString()}</td>
                    <td>${expirationDate.toLocaleString()}</td>
                    <td>
                        <button class="btn-small btn-danger" onclick="deleteFile('${file.pickupCode}')">删除</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        };

        request.onerror = function(event) {
            console.error("获取文件列表失败:", event.target.error);
            showMessage("获取文件列表失败", "error");
        };
    } catch (error) {
        console.error("显示文件列表时出错:", error);
        showMessage("显示文件列表时出错", "error");
    }
  }

  // 添加文件大小格式化函数
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  }

  // 添加删除文件函数
  async function deleteFile(pickupCode) {
    if (!confirm("确定要删除此文件吗？")) {
      return;
    }

    try {
      const db = await dbUtils.openDatabase();
      const transaction = db.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      const request = store.delete(pickupCode);

      request.onsuccess = function() {
        displayUploadedFiles();
        showMessage("文件已删除", "success");
      };

      request.onerror = function(event) {
        console.error("删除文件失败:", event.target.error);
        showMessage("删除文件失败", "error");
      };
    } catch (error) {
      console.error("删除文件时出错:", error);
      showMessage("删除文件时出错", "error");
    }
  }

  // 暴露给全局以供删除按钮使用
  window.deleteFile = deleteFile;

  // 添加数据库操作工具函数
  const dbUtils = {
    async openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("fileRelayDB", 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          // 创建所需的对象存储空间
          if (!db.objectStoreNames.contains("files")) {
            db.createObjectStore("files", { keyPath: "pickupCode" });
          }
          if (!db.objectStoreNames.contains("users")) {
            db.createObjectStore("users", { keyPath: "userKey" });
          }
          if (!db.objectStoreNames.contains("downloads")) {
            db.createObjectStore("downloads", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("cards")) {
            db.createObjectStore("cards", { keyPath: "cardKey" });
          }
        };

        request.onsuccess = () => resolve(request.result);
      });
    },

    async loadAllFiles() {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const request = store.getAll();

        request.onsuccess = () => {
          memoryDb.files = {};
          request.result.forEach((file) => {
            memoryDb.files[file.pickupCode] = file;
          });
          resolve(memoryDb.files);
        };

        request.onerror = () => reject(request.error);
      });
    },

    async saveFile(fileInfo) {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");
        const request = store.add(fileInfo);

        request.onsuccess = () => {
          memoryDb.files[fileInfo.pickupCode] = fileInfo;
          resolve(fileInfo);
        };

        request.onerror = () => reject(request.error);
      });
    },

    async deleteFile(pickupCode) {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");
        const request = store.delete(pickupCode);

        request.onsuccess = () => {
          delete memoryDb.files[pickupCode];
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    },
  };

  // 添加连接状态常量
  const ConnectionState = {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    ERROR: "error",
  };

  let connectionState = ConnectionState.DISCONNECTED;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectInterval = 5000; // 5秒

  function updateConnectionState(newState, message = "") {
    connectionState = newState;
    const statusText = {
      [ConnectionState.DISCONNECTED]: "未连接",
      [ConnectionState.CONNECTING]: "正在连接...",
      [ConnectionState.CONNECTED]: "已连接",
      [ConnectionState.ERROR]: "连接错误",
    };

    connectionStatus.textContent = statusText[newState];
    if (message) {
      showMessage(
        message,
        newState === ConnectionState.CONNECTED ? "success" : "warning"
      );
    }
  }

  function handlePeerReconnection() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log("达到最大重试次数，停止重连");
      updateConnectionState(
        ConnectionState.ERROR,
        "服务器重连失败，请刷新页面重试"
      );
      return;
    }

    reconnectAttempts++;
    console.log(`第${reconnectAttempts}次尝试重连...`);
    updateConnectionState(
      ConnectionState.CONNECTING,
      `正在尝试第${reconnectAttempts}次重连...`
    );

    if (peer.disconnected && !peer.destroyed) {
      peer.reconnect();
    } else {
      // 如果peer已被销毁，使用保存的ID重新创建
      const savedId = localStorage.getItem("serverPeerId");
      initializePeer(savedId);
    }
  }

  function initializePeer(savedId = null) {
    // 如果已存在peer实例，先销毁
    if (peer) {
      peer.destroy();
    }

    // 创建新的peer实例
    peer = new Peer(savedId, {
      debug: 2,
    });

    // 处理打开连接事件
    peer.on("open", function (id) {
      console.log("Server peer ID is: " + id);
      serverId.textContent = id;
      reconnectAttempts = 0; // 重置重试次数
      updateConnectionState(ConnectionState.CONNECTED, "服务器连接成功");

      // 保存新分配的ID
      if (!savedId) {
        localStorage.setItem("serverPeerId", id);
      }
      displayUploadedFiles();
      showMessage("文件列表已刷新", "success");
    });

    // 处理断开连接事件
    peer.on("disconnected", function () {
      console.log("与PeerServer断开连接");
      updateConnectionState(
        ConnectionState.DISCONNECTED,
        "连接断开，正在重连..."
      );
      setTimeout(handlePeerReconnection, reconnectInterval);
    });

    // 处理错误事件
    peer.on("error", function (err) {
      console.error("Peer错误:", err);
      if (err.type === "unavailable-id") {
        console.log("ID已被占用，使用新ID重新连接");
        localStorage.removeItem("serverPeerId");
        initializePeer(null);
      } else {
        updateConnectionState(
          ConnectionState.ERROR,
          "连接发生错误: " + err.message
        );
      }
    });

    // 处理连接请求
    peer.on("connection", function (conn) {
      
      handleClientConnection(conn);
    });
  }

  // 修改初始化函数
  async function initialize() {
    try {
        // 加载已保存的公告
        const savedAnnouncement = localStorage.getItem("announcement");
        if (savedAnnouncement) {
            document.getElementById("announcementEditor").value = savedAnnouncement;
        } else {
            document.getElementById("announcementEditor").value = "# 暂无公告";
            localStorage.setItem("announcement", "# 暂无公告");
        }

        // 初始化公告预览功能
        const previewBtn = document.getElementById("previewAnnouncement");
        const previewModal = document.getElementById("announcementPreviewModal");
        const closePreview = previewModal.querySelector(".close");
        const saveAnnouncementBtn = document.getElementById("saveAnnouncement");

        previewBtn.addEventListener("click", function() {
            const content = document.getElementById("announcementEditor").value;
            document.getElementById("announcementPreview").innerHTML = marked.parse(content);
            previewModal.style.display = "block";
        });

        closePreview.addEventListener("click", function() {
            previewModal.style.display = "none";
        });

        saveAnnouncementBtn.addEventListener("click", function() {
            const content = document.getElementById("announcementEditor").value;
            localStorage.setItem("announcement", content);
            showMessage("公告已保存", "success");
        });

        // 初始化数据库
        await dbUtils.openDatabase();
        
        // 显示文件列表
        await displayUploadedFiles();
        
        // 初始化其他UI组件
        initializeTabs();
        initializeCardManager();
        loadSettings();

        const savedServerId = localStorage.getItem("serverPeerId");
        initializePeer(savedServerId);
    } catch (error) {
        console.error("初始化失败:", error);
        showMessage("初始化失败", "error");
    }
  }

  function handleClientConnection(conn) {
    conn.on("open", function () {
      console.log("客户端连接已打开");
      updateConnectionState(ConnectionState.CONNECTED, "客户端已连接");
      announcement = localStorage.getItem("announcement");

      if (announcement === null) {
        announcement = "# 暂无公告";
      }

      conn.send({
        type: "membershipStatus",
        enabled: settings.enableVIP,
        isMember: false,
        announcement: announcement,
      });
    });

    // 处理接收到的数据
    conn.on("data", function (data) {
      

      if (data.type === "upload") {
        handleFileUpload(data, conn);
      } else if (data.type === "download") {
        handleFileDownload(data, conn);
      }
    });

    conn.on("close", function () {
      console.log("客户端连接已关闭");
      updateConnectionState(
        ConnectionState.DISCONNECTED,
        "客户端已断开连接"
      );
    });

    conn.on("error", function (err) {
      console.error("连接错误:", err);
      updateConnectionState(ConnectionState.ERROR, "连接发生错误");
    });
  }

  async function handleFileDownload(data, conn) {
    try {
       
        const pickupCode = data.pickupCode;

        const db = await dbUtils.openDatabase();
        const transaction = db.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const request = store.get(pickupCode);

        request.onsuccess = function() {
            const fileInfo = request.result;
            if (!fileInfo) {
                conn.send({
                    type: "downloadResponse",
                    success: false,
                    message: "文件不存在"
                });
                return;
            }

            conn.send({
                type: "downloadResponse",
                fileName: fileInfo.name,
                success: true,
                data: fileInfo.data,
            });
        };

        request.onerror = function(event) {
            console.error("获取文件信息失败:", event.target.error);
            conn.send({
                type: "downloadResponse",
                success: false,
                message: "获取文件信息失败"
            });
        };
    } catch (error) {
        console.error("处理文件下载时出错:", error);
        conn.send({
            type: "downloadResponse",
            success: false,
            message: error.message || "文件下载失败"
        });
    }
  }

  // 修改文件上传处理函数
  async function handleFileUpload(data, conn) {
    try {
        if (!data || typeof data !== "object") {
            throw new Error("无效的上传数据");
        }

        // 从data中提取文件信息
        const userKey = data.userKey;
        const file = {
            name: data.fileName,
            size: data.fileSize,
            type: data.type,
            data: data.fileData,
        };

        console.log("处理上传数据:", { ...data, fileData: "(已省略)" });
        console.log("构建的文件对象:", { ...file, data: "(已省略)" });

        if (!file.size || !file.name || !file.type || !file.data) {
            console.error("文件对象缺少必要属性:", { ...file, data: "(已省略)" });
            throw new Error("文件数据不完整");
        }

        // 检查用户权限和文件大小限制
        const db = await dbUtils.openDatabase();
        const userTransaction = db.transaction(["users"], "readonly");
        const userStore = userTransaction.objectStore("users");
        const userRequest = userStore.get(userKey);

        const userInfo = await new Promise((resolve, reject) => {
            userRequest.onsuccess = () => resolve(userRequest.result);
            userRequest.onerror = () => reject(userRequest.error);
        });

        const maxSize = settings.enableVIP && userInfo?.isVIP
            ? settings.vipSettings.maxFileSize
            : settings.maxFileSize;

        if (file.size > maxSize * 1024 * 1024) {
            throw new Error(`文件大小超过限制 (${maxSize}MB)`);
        }

        // 生成取件码
        const pickupCode = await generatePickupCode();

        // 计算过期时间
        const expirationDays = settings.enableVIP && userInfo?.isVIP
            ? settings.vipSettings.expirationDays
            : settings.expirationDays;
        const expirationTime = new Date();
        expirationTime.setDate(expirationTime.getDate() + expirationDays);

        // 保存文件信息
        const fileInfo = {
            id: pickupCode,
            name: file.name,
            size: file.size,
            type: file.type,
            data: file.data,
            pickupCode: pickupCode,
            uploadTime: new Date().toISOString(),
            expirationTime: expirationTime.toISOString(),
            uploader: userKey || "guest",
        };

        // 保存到数据库
        const fileTransaction = db.transaction(["files"], "readwrite");
        const fileStore = fileTransaction.objectStore("files");
        const saveRequest = fileStore.add(fileInfo);

        await new Promise((resolve, reject) => {
            saveRequest.onsuccess = () => resolve();
            saveRequest.onerror = () => reject(saveRequest.error);
        });

        // 更新显示
        displayUploadedFiles();

        // 发送成功响应
        conn.send({
            type: "uploadResponse",
            success: true,
            pickupCode: pickupCode,
            message: "文件上传成功",
        });

        showMessage("新文件已上传", "success");
    } catch (error) {
        console.error("处理文件上传时出错:", error);
        conn.send({
            type: "uploadResponse",
            success: false,
            message: error.message || "文件上传失败",
        });
    }
  }

  // 修改生成取件码函数
  async function generatePickupCode() {
    const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const length = 6;
    let code;
    const db = await dbUtils.openDatabase();

    do {
        code = "";
        for (let i = 0; i < length; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // 检查代码是否已存在
        const transaction = db.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const request = store.get(code);
        
        const exists = await new Promise(resolve => {
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });

        if (!exists) break;
    } while (true);

    return code;
  }

  // 初始化tab切换
  function initializeTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // 移除所有active类
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabPanes.forEach((pane) => pane.classList.remove("active"));

        // 添加active类到当前选中的tab
        button.classList.add("active");
        const tabId = button.getAttribute("data-tab");
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }

  function initializeCardManager() {
    const cardModal = document.getElementById("cardModal");
    const cardManagerBtn = document.getElementById("cardManager");
    const generateBtn = document.getElementById("generateCards");
    const exportBtn = document.getElementById("exportCards");
    const closeBtn = cardModal.querySelector(".close");

    cardManagerBtn.addEventListener("click", async function() {
        cardModal.style.display = "block";
        await updateCardsTable();
    });

    generateBtn.addEventListener("click", async function() {
        const count = parseInt(document.getElementById("cardCount").value);
        if (count > 0 && count <= 100) {
            await generateCards(count);
            await updateCardsTable();
        } else {
            alert("请输入1-100之间的数量");
        }
    });

    exportBtn.addEventListener("click", function() {
        exportUnusedCards();
    });

    closeBtn.addEventListener("click", function() {
        cardModal.style.display = "none";
    });

    window.addEventListener("click", function(event) {
        if (event.target == cardModal) {
            cardModal.style.display = "none";
        }
    });

    // 暴露给全局以供删除按钮使用
    window.deleteCard = deleteCard;
  }

  async function generateCard() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments = 4;
    const segmentLength = 4;
    let card = "";

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segmentLength; j++) {
            card += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        if (i < segments - 1) card += "-";
    }

    return card;
  }

  async function generateCards(count) {
    const cards = [];
    const db = await dbUtils.openDatabase();
    const transaction = db.transaction(["cards"], "readwrite");
    const store = transaction.objectStore("cards");

    for (let i = 0; i < count; i++) {
        let card;
        do {
            card = await generateCard();
            const request = store.get(card);
            const exists = await new Promise(resolve => {
                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => resolve(false);
            });
            if (!exists) break;
        } while (true);

        const cardInfo = {
            cardKey: card,
            createdAt: new Date().toISOString(),
            used: false,
            usedBy: null,
            usedAt: null
        };

        const request = store.add(cardInfo);
        await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        cards.push(card);
    }

    await updateCardsTable();
    return cards;
  }

  async function deleteCard(card) {
    try {
        const db = await dbUtils.openDatabase();
        const transaction = db.transaction(["cards"], "readwrite");
        const store = transaction.objectStore("cards");
        
        const getRequest = store.get(card);
        const cardInfo = await new Promise((resolve, reject) => {
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        });

        if (cardInfo && !cardInfo.used) {
            const deleteRequest = store.delete(card);
            await new Promise((resolve, reject) => {
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
            });
            await updateCardsTable();
            showMessage("卡密已删除", "success");
        }
    } catch (error) {
        console.error("删除卡密时出错:", error);
        showMessage("删除卡密失败", "error");
    }
  }

  async function updateCardsTable() {
    const tbody = document.querySelector("#cardsTable tbody");
    tbody.innerHTML = "";

    try {
        const db = await dbUtils.openDatabase();
        const transaction = db.transaction(["cards"], "readonly");
        const store = transaction.objectStore("cards");
        const request = store.getAll();

        const cards = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!cards || cards.length === 0) {
            return;
        }

        cards.forEach((cardInfo) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${cardInfo.cardKey}</td>
                <td>${new Date(cardInfo.createdAt).toLocaleString()}</td>
                <td>
                    <span class="card-status ${cardInfo.used ? "used" : "unused"}">
                        ${cardInfo.used ? "已使用" : "未使用"}
                    </span>
                </td>
                <td>
                    ${cardInfo.used 
                        ? `使用者: ${cardInfo.usedBy}<br>使用时间: ${new Date(cardInfo.usedAt).toLocaleString()}`
                        : `<button class="btn-small delete-btn" onclick="deleteCard('${cardInfo.cardKey}')">删除</button>`
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("更新卡密列表时出错:", error);
        showMessage("更新卡密列表失败", "error");
    }
  }

  async function exportUnusedCards() {
    try {
        const db = await dbUtils.openDatabase();
        const transaction = db.transaction(["cards"], "readonly");
        const store = transaction.objectStore("cards");
        const request = store.getAll();

        const cards = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!cards || cards.length === 0) {
            alert("没有可导出的卡密");
            return;
        }

        // 获取所有未使用的卡密
        const unusedCards = cards
            .filter(card => !card.used)
            .map(card => card.cardKey);

        if (unusedCards.length === 0) {
            alert("没有未使用的卡密可导出");
            return;
        }

        // 创建文本内容
        const content = unusedCards.join("\n");

        // 创建Blob对象
        const blob = new Blob([content], { type: "text/plain" });

        // 创建下载链接
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `未使用卡密_${new Date().toISOString().split("T")[0]}.txt`;

        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch (error) {
        console.error("导出卡密时出错:", error);
        alert("导出卡密失败");
    }
  }

  // 添加删除所有文件的函数
  async function deleteAllFiles() {
    if (!confirm("确定要删除所有文件吗？此操作不可恢复！")) {
      return;
    }

    try {
      const request = indexedDB.open("fileRelayDB", 1);

      request.onsuccess = function (event) {
        const db = event.target.result;
        const transaction = db.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");

        const clearRequest = store.clear();
        console.log("clearRequest", clearRequest);
        clearRequest.onsuccess = function () {
          console.log("所有文件已删除");
          // 清除内存中的文件记录
          if (window.memoryDb && window.memoryDb.files) {
            window.memoryDb.files = {};
          }
          displayUploadedFiles();
          showMessage("所有文件已删除", "success");
        };

        clearRequest.onerror = function (event) {
          console.error("删除所有文件失败:", event.target.error);
          showMessage("删除所有文件失败", "warning");
        };

        //内存中删除
        if (window.memoryDb && window.memoryDb.files) {
          window.memoryDb.files = {};
        }
      };

      request.onerror = function (event) {
        console.error("打开数据库失败:", event.target.error);
        showMessage("打开数据库失败", "warning");
      };
    } catch (error) {
      console.error("删除所有文件时出错:", error);
      showMessage("删除所有文件时出错", "warning");
    }
  }

  // 添加删除所有文件按钮的事件监听器
  document
    .getElementById("deleteAllFiles")
    .addEventListener("click", deleteAllFiles);

  // 添加刷新按钮的事件监听器
  document
    .getElementById("refreshFiles")
    .addEventListener("click", function () {
      displayUploadedFiles();
      showMessage("文件列表已刷新", "success");
    });

  initialize();
  saveSettingsButton.addEventListener("click", saveSettings);

  // 每分钟检查一次设置更新
  setInterval(checkSettings, 60000);

  // 添加样式
  const style = document.createElement("style");
  style.textContent += `
          .users-section {
              margin-top: 30px;
          }

          #usersTable {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
          }

          #usersTable th,
          #usersTable td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #333;
          }

          #usersTable th {
              background-color: #2C2C2C;
              color: #BB86FC;
          }

          .btn-member {
              background-color: #4CAF50;
          }

          .btn-member:hover {
              background-color: #45a049;
          }

          .btn-banned {
              background-color: #f44336;
          }

          .btn-banned:hover {
              background-color: #da190b;
          }

          .btn-unbanned {
              background-color: #2196F3;
          }

          .btn-unbanned:hover {
              background-color: #0b7dda;
          }

          .info-actions {
              margin-top: 15px;
          }

          .info-actions .btn-refresh {
              background-color: #3700B3;
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 8px 16px;
          }

          .info-actions .btn-refresh:hover {
              background-color: #6200EE;
          }

          .info-actions .refresh-icon {
              display: inline-block;
              transition: transform 0.3s ease;
          }

          .info-actions .btn-refresh:hover .refresh-icon {
              transform: rotate(180deg);
          }
      `;
  document.head.appendChild(style);

  // 添加tab样式
  const tabStyle = document.createElement("style");
  tabStyle.textContent = `
          .tab-container {
              margin-top: 20px;
          }

          .tab-header {
              display: flex;
              gap: 10px;
              margin-bottom: 20px;
          }

          .tab-button {
              padding: 10px 20px;
              background-color: #2C2C2C;
              border: 1px solid #444;
              border-radius: 4px;
              color: #e0e0e0;
              cursor: pointer;
              transition: all 0.3s ease;
          }

          .tab-button:hover {
              background-color: #3C3C3C;
          }

          .tab-button.active {
              background-color: #BB86FC;
              color: #1E1E1E;
              border-color: #BB86FC;
          }

          .tab-content {
              background-color: #1E1E1E;
              border-radius: 8px;
              border: 1px solid #333;
          }

          .tab-pane {
              display: none;
              padding: 20px;
          }

          .tab-pane.active {
              display: block;
          }
      `;
  document.head.appendChild(tabStyle);

  // 添加消息提示函数
  function showMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // 5秒后自动移除消息
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
  }

  // 添加消息提示样式
  const messageStyle = document.createElement("style");
  messageStyle.textContent = `
    .message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    }

    .success {
        background-color: #4CAF50;
    }

    .warning {
        background-color: #FF9800;
    }

    .error {
        background-color: #f44336;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(messageStyle);

// 暴露给全局以供其他函数使用
window.showMessage = showMessage;
})();