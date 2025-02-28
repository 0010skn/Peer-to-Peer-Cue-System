(function () {
    const fileInput = document.getElementById("fileInput");
    const uploadButton = document.getElementById("uploadButton");
    const resultSection = document.querySelector(".result-section");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const pickupCode = document.getElementById("pickupCode");
    const relayServer = document.getElementById("relayServer");
    const relayServerInput = document.getElementById("relayServerInput");
    const pickupCodeInput = document.getElementById("pickupCodeInput");
    const downloadButton = document.getElementById("downloadButton");
    const expirationTime = document.getElementById("expirationTime");
    const userKeyDisplay = document.getElementById("userKey");
    const customKeyInput = document.getElementById("customKeyInput");
    const setKeyButton = document.getElementById("setKeyButton");
    const historyButton = document.getElementById("historyButton");
    const unlockVIPButton = document.getElementById("unlockVIPButton");

    let peer;
    let conn;
    let currentUserKey = "";
    let connectionHistory = [];

    function initialize() {
      // 初始化数据库
      initializeDB();
      // 加载历史记录
      loadConnectionHistory();
      // 从IndexedDB加载用户key
      loadUserKey();
      // 立即显示历史记录按钮
      historyButton.style.display = "inline-block";
      // 初始化历史记录弹窗
      initializeHistoryModal();

      peer = new Peer(null, {
        debug: 2,
      });

      peer.on("open", function (id) {
        console.log("Connected with ID:", id);
        document.querySelector(".key-input-group").style.display = "block";

        // 自动连接最近的服务器
        if (connectionHistory.length > 0) {
          // 按最后使用时间排序
          connectionHistory.sort(
            (a, b) => new Date(b.lastUsed) - new Date(a.lastUsed)
          );
          const lastConnection = connectionHistory[0];
          console.log(
            "正在自动连接到最近的服务器:",
            lastConnection.serverId
          );
          connectToRelayServer(
            lastConnection.serverId,
            lastConnection.userKey
          );
        }
      });

      // 初始化VIP解锁功能
      initializeVIPUnlock();
    }

    function initializeHistoryModal() {
      const historyModal = document.getElementById("historyModal");
      const historyCloseBtn = historyModal.querySelector(".close");

      // 更新历史记录显示
      updateHistoryDisplay();

      historyCloseBtn.addEventListener("click", function () {
        historyModal.style.display = "none";
      });

      window.addEventListener("click", function (event) {
        if (event.target == historyModal) {
          historyModal.style.display = "none";
        }
      });

      // 修改历史记录按钮点击事件
      historyButton.addEventListener("click", function () {
        updateHistoryDisplay(); // 确保显示最新的历史记录
        historyModal.style.display = "block";
      });
    }

    function loadConnectionHistory() {
      const history = localStorage.getItem("connectionHistory");
      if (history) {
        connectionHistory = JSON.parse(history);
      }
    }

    function saveConnectionHistory() {
      localStorage.setItem(
        "connectionHistory",
        JSON.stringify(connectionHistory)
      );
    }

    function addToHistory(serverId, userKey) {
      const now = new Date().toISOString();
      // 检查是否已存在相同的记录
      const existingIndex = connectionHistory.findIndex(
        (item) => item.serverId === serverId && item.userKey === userKey
      );

      if (existingIndex !== -1) {
        // 更新已存在的记录
        connectionHistory[existingIndex].lastUsed = now;
      } else {
        // 添加新记录
        connectionHistory.push({
          serverId,
          userKey,
          firstUsed: now,
          lastUsed: now,
        });
      }

      saveConnectionHistory();
      updateHistoryDisplay();
    }

    function updateHistoryDisplay() {
      const historyList = document.querySelector(".history-list");
      historyList.innerHTML = "";

      // 按最后使用时间排序
      connectionHistory.sort(
        (a, b) => new Date(b.lastUsed) - new Date(a.lastUsed)
      );

      connectionHistory.forEach((item) => {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";
        historyItem.innerHTML = `
                    <div class="history-info">
                        <div class="server-info">
                            <span class="label">服务器ID:</span>
                            <span class="value">${item.serverId}</span>
                        </div>
                        <div class="key-info">
                            <span class="label">用户Key:</span>
                            <span class="value">${
                              item.userKey || "未设置"
                            }</span>
                        </div>
                        <div class="time-info">
                            <div>首次使用: ${formatDate(
                              item.firstUsed
                            )}</div>
                            <div>最后使用: ${formatDate(
                              item.lastUsed
                            )}</div>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="btn btn-small use-key" data-server="${
                          item.serverId
                        }" data-key="${item.userKey}">使用此配置</button>
                        <button class="btn btn-small btn-delete" data-server="${
                          item.serverId
                        }" data-key="${item.userKey}">删除</button>
                    </div>
                `;
        historyList.appendChild(historyItem);
      });

      // 添加事件监听
      document.querySelectorAll(".use-key").forEach((button) => {
        button.addEventListener("click", function () {
          const serverId = this.dataset.server;
          const userKey = this.dataset.key;
          document.getElementById("historyModal").style.display = "none";
          if (userKey) {
            customKeyInput.value = userKey;
            currentUserKey = userKey;
            userKeyDisplay.textContent = userKey;
          }
          connectToRelayServer(serverId, userKey);
        });
      });

      document.querySelectorAll(".btn-delete").forEach((button) => {
        button.addEventListener("click", function () {
          const serverId = this.dataset.server;
          const userKey = this.dataset.key;
          if (confirm("确定要删除这条历史记录吗？")) {
            deleteHistoryItem(serverId, userKey);
          }
        });
      });
    }

    function deleteHistoryItem(serverId, userKey) {
      connectionHistory = connectionHistory.filter(
        (item) => !(item.serverId === serverId && item.userKey === userKey)
      );
      saveConnectionHistory();
      updateHistoryDisplay();
    }

    function connectToRelayServer(serverId, userKey = "") {
      if (userKey) {
        currentUserKey = userKey;
        userKeyDisplay.textContent = currentUserKey;
        saveUserKey(userKey);
      }

      // 如果已有连接，先关闭
      if (conn) {
        conn.close();
      }

      conn = peer.connect(serverId);

      conn.on("open", function () {
        console.log("Connected to relay server");
        // 发送用户key到服务器进行验证
        conn.send({
          type: "setKey",
          key: currentUserKey,
        });
      });

      conn.on("data", function (data) {
      

        if (data.type === "uploadResponse") {
          if (data.success) {
            // 显示上传结果
            resultSection.classList.remove("hidden");
            fileName.textContent = fileInput.files[0].name;
            fileSize.textContent = formatFileSize(fileInput.files[0].size);
            pickupCode.textContent = data.pickupCode;
            relayServer.textContent = conn.peer;

            // 计算过期时间
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 7); // 默认7天
            expirationTime.textContent = expireDate.toLocaleString();

            showMessage("文件上传成功", "success");
          } else {
            showMessage(data.message || "文件上传失败", "error");
          }
        } else if (data.type === "keyStatus") {
          currentUserKey = data.key;
          userKeyDisplay.textContent = currentUserKey;
          saveUserKey(currentUserKey);
          addToHistory(conn.peer, currentUserKey);

          if (data.isExisting) {
            showMessage("使用已存在的Key登录成功", "success");
          } else {
            showMessage("已为您生成新的Key,请妥善保管", "warning");
          }
        } else if (data.type === "membershipStatus") {
          const unlockButton = document.getElementById("unlockVIPButton");
          if (data.announcement) {
            const announcementDiv = document.getElementById("announcement");
            announcementDiv.innerHTML = "";
            const markdownContent = document.createElement("div");
            markdownContent.className = "markdown-content";
            markdownContent.innerHTML = marked.parse(data.announcement);
            announcementDiv.appendChild(markdownContent);
            // 添加淡入动画
            announcementDiv.style.animation = "none";
            announcementDiv.offsetHeight; // 触发重绘
            announcementDiv.style.animation = "fadeIn 0.5s ease-out";
          }
          if (data.enabled) {
            unlockButton.style.display = "inline-block";
            if (data.isMember) {
              unlockButton.textContent = "✨ 已解锁会员";
              unlockButton.disabled = true;
            } else {
              unlockButton.textContent = "⭐ 解锁会员";
              unlockButton.disabled = false;
            }
          } else {
            unlockButton.style.display = "none";
          }
        } else if (data.type === "cardValidation") {
          if (data.success) {
            alert(data.message);
            const unlockButton = document.getElementById("unlockVIPButton");
            unlockButton.textContent = "✨ 已解锁会员";
            unlockButton.disabled = true;
            document.getElementById("vipUnlockModal").style.display =
              "none";
          } else {
            alert(data.error);
          }
        } else if (data.type === "downloadResponse") {
          if (data.success) {
            const blob = new Blob([data.data], {
              type: "application/octet-stream",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = data.fileName;
            a.click();
            showMessage("文件下载成功", "success");
          } else {
            showMessage("文件下载失败", "error");
          }
        }
      });

      conn.on("close", function () {
        console.log("Connection closed");
        const unlockButton = document.getElementById("unlockVIPButton");
        unlockButton.style.display = "none";
      });

      conn.on("error", function (err) {
        console.error("Connection error:", err);
      });
    }

    // 从IndexedDB加载用户key
    function loadUserKey() {
      const request = indexedDB.open("fileRelayDB", 1);

      request.onsuccess = function (event) {
        const db = event.target.result;
        const transaction = db.transaction(["users"], "readonly");
        const store = transaction.objectStore("users");
        const getRequest = store.get("currentUser");

        getRequest.onsuccess = function () {
          if (getRequest.result) {
            currentUserKey = getRequest.result.key;
            userKeyDisplay.textContent = currentUserKey;
          }
        };
      };
    }

    // 保存用户key到IndexedDB
    function saveUserKey(userKey) {
      const request = indexedDB.open("fileRelayDB", 1);

      request.onsuccess = function (event) {
        const db = event.target.result;
        const transaction = db.transaction(["users"], "readwrite");
        const store = transaction.objectStore("users");

        // 使用正确的键路径格式
        const userData = {
          id: "currentUser",
          key: userKey,
          lastUsed: new Date(),
        };

        // 使用put而不是add，这样如果记录已存在会更新它
        const putRequest = store.put(userData);

        putRequest.onerror = function (event) {
          console.error("保存用户Key失败:", event.target.error);
        };

        putRequest.onsuccess = function (event) {
          console.log("用户Key保存成功");
        };
      };

      request.onerror = function (event) {
        console.error("打开数据库失败:", event.target.error);
      };
    }

    // 初始化IndexedDB
    function initializeDB() {
      const request = indexedDB.open("fileRelayDB", 1);

      request.onerror = function (event) {
        console.error("数据库错误:", event.target.error);
      };

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        // 创建文件存储
        if (!db.objectStoreNames.contains("files")) {
          const filesStore = db.createObjectStore("files", {
            keyPath: "id",
          });
          // 添加索引以便按上传时间和用户Key查询
          filesStore.createIndex("uploadTime", "uploadTime", {
            unique: false,
          });
          filesStore.createIndex("userKey", "userKey", { unique: false });
          filesStore.createIndex("pickupCode", "pickupCode", {
            unique: true,
          });
        }

        // 创建用户存储
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "id" });
        }

        // 创建下载记录存储
        if (!db.objectStoreNames.contains("downloads")) {
          const downloadsStore = db.createObjectStore("downloads", {
            keyPath: "id",
            autoIncrement: true,
          });
          // 添加复合索引以便按用户和日期查询
          downloadsStore.createIndex("userKey_date", ["userKey", "date"], {
            unique: false,
          });
        }
      };

      request.onsuccess = function (event) {
        console.log("IndexedDB初始化成功");
      };
    }

    function generatePickupCode() {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const length = 8;
      let code = "";

      for (let i = 0; i < length; i++) {
        code += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }

      return code;
    }

    function uploadFile() {
      const file = fileInput.files[0];
      if (!file) {
        alert("请先选择文件");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const fileData = {
          type: "upload",
          fileName: file.name,
          fileSize: file.size,
          fileData: e.target.result,
          userKey: currentUserKey,
          pickupCode: generatePickupCode(),
        };

        if (conn && conn.open) {
          conn.send(fileData);
          // 显示上传中的状态
          showMessage("文件上传中...", "info");
        } else {
          alert("未连接到中转服务器");
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function downloadFile() {
      const relayServerId = relayServerInput.value.trim();
      const code = pickupCodeInput.value.trim();

      if (!relayServerId || !code) {
        alert("请输入中转服务器地址和取件码");
        return;
      }

      if (!conn || !conn.open) {
        connectToRelayServer(relayServerId);
      }

      // 等待连接建立
      const checkConnection = setInterval(() => {
        if (conn && conn.open) {
          clearInterval(checkConnection);
          conn.send({
            type: "download",
            pickupCode: code,
            userKey: currentUserKey,
          });
        }
      }, 100);

      // 5秒后如果还没连接上就超时
      setTimeout(() => {
        clearInterval(checkConnection);
        if (!conn || !conn.open) {
          alert("连接服务器超时");
        }
      }, 5000);
    }

    function formatFileSize(bytes) {
      const units = ["B", "KB", "MB", "GB", "TB"];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return size.toFixed(2) + " " + units[unitIndex];
    }

    function formatDate(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    }

    function setCookie(name, value, days) {
      let expires = "";
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
          return c.substring(nameEQ.length, c.length);
      }
      return null;
    }

    function showMessage(message, type) {
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${type}`;
      messageDiv.textContent = message;
      document.body.appendChild(messageDiv);

      setTimeout(() => {
        messageDiv.remove();
      }, 5000);
    }

    function initializeVIPUnlock() {
      const unlockButton = document.getElementById("unlockVIPButton");
      const vipModal = document.getElementById("vipUnlockModal");
      const closeBtn = vipModal.querySelector(".close");
      const validateBtn = document.getElementById("validateCard");
      const cardInput = document.getElementById("cardInput");

      // 格式化卡密输入
      cardInput.addEventListener("input", function (e) {
        let value = e.target.value.replace(/[^A-Z0-9]/g, "");
        let formatted = "";
        for (let i = 0; i < value.length && i < 16; i++) {
          if (i > 0 && i % 4 === 0) {
            formatted += "-";
          }
          formatted += value[i];
        }
        e.target.value = formatted;
      });

      unlockButton.addEventListener("click", function () {
        vipModal.style.display = "block";
      });

      closeBtn.addEventListener("click", function () {
        vipModal.style.display = "none";
      });

      window.addEventListener("click", function (event) {
        if (event.target == vipModal) {
          vipModal.style.display = "none";
        }
      });

      validateBtn.addEventListener("click", function () {
        const card = cardInput.value.trim();
        if (card.length !== 19) {
          alert("请输入完整的卡密");
          return;
        }

        if (conn) {
          conn.send({
            type: "validateCard",
            card: card,
            userKey: currentUserKey,
          });
        }
      });
    }

    initialize();
    console.log("FileRelay脚本已加载");

    uploadButton.addEventListener("click", function () {
      const relayServerId = prompt("请输入中转服务器的ID:");
      if (!relayServerId) return;

      if (!conn || !conn.open) {
        connectToRelayServer(relayServerId);
      }

      // 等待连接建立
      const checkConnection = setInterval(() => {
        if (conn && conn.open) {
          clearInterval(checkConnection);
          uploadFile();
        }
      }, 100);

      // 5秒后如果还没连接上就超时
      setTimeout(() => {
        clearInterval(checkConnection);
        if (!conn || !conn.open) {
          alert("连接服务器超时");
        }
      }, 5000);
    });

    downloadButton.addEventListener("click", downloadFile);

    setKeyButton.addEventListener("click", function () {
      const customKey = customKeyInput.value.trim();
      if (customKey) {
        currentUserKey = customKey;
        userKeyDisplay.textContent = currentUserKey;
        // 存储用户key到IndexedDB
        saveUserKey(currentUserKey);
      }
    });
    console.log("FileRelay脚本已加载");
    // 添加消息提示样式
    const style = document.createElement("style");
    style.textContent = `
            .message {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 4px;
                color: white;
                z-index: 1000;
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

            .info {
                background-color: #2196F3;
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
    document.head.appendChild(style);

    // 添加历史记录样式
    const historyStyle = document.createElement("style");
    historyStyle.textContent = `
            .history-list {
                max-height: 400px;
                overflow-y: auto;
            }

            .history-item {
                background-color: #2C2C2C;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 10px;
                border: 1px solid #444;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .history-info {
                flex: 1;
            }

            .history-actions {
                display: flex;
                gap: 10px;
            }

            .server-info,
            .key-info {
                margin-bottom: 5px;
            }

            .time-info {
                font-size: 0.9em;
                color: #888;
                margin-top: 5px;
            }

            .btn-delete {
                background-color: #CF6679;
            }

            .btn-delete:hover {
                background-color: #B00020;
            }

            .modal {
                display: none;
                position: fixed;
                z-index: 9999;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
                overflow-y: auto;
            }

            .modal-content {
                position: relative;
                background-color: #1E1E1E;
                margin: 5vh auto;
                padding: 0;
                width: 80%;
                max-width: 800px;
                border-radius: 12px;
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
                border: 1px solid #333;
            }

            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h2 {
                margin: 0;
                color: #BB86FC;
            }

            .modal-body {
                padding: 20px;
            }

            .close {
                color: #aaa;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }

            .close:hover {
                color: #BB86FC;
            }

            .header-actions {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .btn-refresh {
                background-color: #3700B3;
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 6px 12px;
                font-size: 0.9em;
            }

            .btn-refresh:hover {
                background-color: #6200EE;
            }

            .refresh-icon {
                display: inline-block;
                transition: transform 0.3s ease;
            }

            .btn-refresh:hover .refresh-icon {
                transform: rotate(180deg);
            }
        `;
    document.head.appendChild(historyStyle);

    console.log("FileRelay Client Initialized");
  })();