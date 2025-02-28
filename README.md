做一个文件传输的html,再做个文件传输中转的html,具体就是先打开文件传输中转创建一个连接(管理员),其他用户可以通过文件传输的html上传文件生成一个专属取件码,取件码和文件本体传输到文件传输中转,然后储存在文件传输中转的本地数据库(可以用浏览器的本地存储 无限制大小的那种,key是取件码,value是文件本体),其他人连接到相同的文件传输html上方填写中转的地址和取件码后可以取出文件(下载),这两个html入口也要放在首页. @Web 


<div style="white-space: pre;">

# Peer-to-Peer Cue System | 点对点提示系统 | ピアツーピア・キューシステム #

## English Version

A modern WebRTC-based system for real-time communication and visual signaling through peer-to-peer connections.
Originally developed to provide seamless cues for stage actors during theater performances.

🔗 **Live Demo**: [https://0010skn.github.io/Peer-to-Peer-Cue-System](https://0010skn.github.io/Peer-to-Peer-Cue-System)

📚 **Reference**: [PeerJS examples](https://peerjs.com/examples.html)

### Setup Guide

1. Launch `receive.html` on your receiving device
2. Open `send.html` on your control device
3. Copy the unique ID displayed on the receiving device
4. Paste this ID into the sender's connection field
5. Click **Connect** to establish the link
6. Both devices will confirm connection in the **Status** area

### Key Features

✅ **Receiver**: Features prominent visual indicators for standby, go, fade, and stop signals  
✅ **Sender**: Provides intuitive control buttons to trigger various cue signals  
✅ **Communication**: Includes a two-way messaging system for additional coordination  
✅ **Reliability**: Built on WebRTC for stable, low-latency connections

---

## 中文版本

基于WebRTC技术的现代化点对点实时通信和视觉信号系统。
最初设计用于剧场表演中为舞台演员提供无缝提示信号。

🔗 **在线演示**: [https://0010skn.github.io/Peer-to-Peer-Cue-System](https://0010skn.github.io/Peer-to-Peer-Cue-System)

📚 **参考资料**: [PeerJS 示例](https://peerjs.com/examples.html)

### 设置指南

1. 在接收设备上打开 `receive.html`
2. 在控制设备上打开 `send.html`
3. 复制接收设备上显示的唯一ID
4. 将此ID粘贴到发送设备的连接字段中
5. 点击**连接**建立链接
6. 两台设备都将在**状态**区域确认连接成功

### 主要功能

✅ **接收端**: 提供醒目的视觉指示器，用于待命、开始、淡出和停止信号  
✅ **发送端**: 提供直观的控制按钮，可触发各种提示信号  
✅ **通信**: 包含双向消息系统，用于额外协调  
✅ **可靠性**: 基于WebRTC构建，确保稳定、低延迟的连接

---

## 日本語版

WebRTCベースのピアツーピア接続を使用したリアルタイム通信と視覚的な合図のための最新システム。
元々は劇場公演中の舞台俳優にシームレスな合図を提供するために開発されました。

🔗 **ライブデモ**: [https://0010skn.github.io/Peer-to-Peer-Cue-System](https://0010skn.github.io/Peer-to-Peer-Cue-System)

📚 **参考**: [PeerJS サンプル](https://peerjs.com/examples.html)

### セットアップガイド

1. 受信デバイスで `receive.html` を起動します
2. 制御デバイスで `send.html` を開きます
3. 受信デバイスに表示される固有IDをコピーします
4. このIDを送信者の接続フィールドに貼り付けます
5. **接続**をクリックしてリンクを確立します
6. 両方のデバイスが**ステータス**エリアで接続を確認します

### 主な機能

✅ **レシーバー**: スタンバイ、ゴー、フェード、ストップ信号のための目立つ視覚的インジケーターを提供  
✅ **センダー**: 様々な合図信号をトリガーするための直感的な制御ボタンを提供  
✅ **コミュニケーション**: 追加の調整のための双方向メッセージングシステムを含む  
✅ **信頼性**: 安定した低遅延接続のためのWebRTCベースの構築
</div>