/**
 * submit_script.js - Tableau WDC 前端發送邏輯
 * 發送數據到 Node.js 代理 (透過 Ngrok 隧道)
 */

// 1. Ngrok 產生的公開 HTTPS 網址 (每次啟動 ngrok 都會改變，需要即時更新)
const NGROK_PUBLIC_URL = 'https://d9a84d701603.ngrok-free.app'; 

// 2. 動態獲取當前完整的 URL
const currentDashboardUrl = window.location.href; 
console.log('當前 URL:', currentDashboardUrl);

// 3. Dify 代理的完整 Webhook URL
 const DIFY_WEBHOOK_URL = `${NGROK_PUBLIC_URL}/proxy/dify`; 

// *******************************************************************


// 當 HTML 文件完全載入後，綁定按鈕事件
document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('send-button'); // 假設您的按鈕 ID 是 send-button
    if (sendButton) {
        sendButton.addEventListener('click', sendDataToDify);
    }
});


/**
 * 核心函數：從 Tableau 前端收集資料並發送給 Node.js 代理
 */
async function sendDataToDify() {
    
    // 獲取用戶輸入 (例如：問題描述)
    const userInputElement = document.getElementById('user-query'); // 假設輸入欄位 ID 是 user-query
    const userQuery = userInputElement ? userInputElement.value : "未提供查詢內容";
    
    // 獲取群組選擇 (從下拉式選單獲取值)
    const groupSelectElement = document.getElementById('group-selector'); // 假設下拉選單 ID 是 group-selector
    const targetGroupId = groupSelectElement ? groupSelectElement.value : "Default_Group";

    // 獲取 Tableau 相關資訊 (僅為範例，實際可能需透過 Tableau JS API 獲取)
    const tableauUser = tableau.connectionData.user || 'Guest_User'; 

    // 檢查 Ngrok URL 是否設定
    if (NGROK_PUBLIC_URL.includes('xxxx-xxxx-xxxx')) {
        alert('❌ 錯誤：請更新 NGROK_PUBLIC_URL 變數為您目前的 Ngrok 網址。');
        return;
    }

    // 組裝 JSON Payload，Key 必須與 Dify 工作流「開始」節點的輸入完全一致
    const tableauPayload = {
        // Dify 工作流的輸入變數:
        "recipient_email": targetGroupId,           // ❗ 傳遞群組 ID 給 Dify 進行映射
        "message_content": userQuery,               // 用戶輸入的核心內容
        "message_url": currentDashboardUrl,         // 儀表板連結
        "message_title": "Tableau Chatbot 請求 (來自 " + tableauUser + ")",
        "response_mode": "blocking",                // Dify 的標準參數
        "user": tableauUser,                        // 發送者
        "sys.files": null                           // 保持 null 
    };

    console.log('發送 Payload:', tableauPayload);
    
    try {
        const response = await fetch(DIFY_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tableauPayload),
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ 訊息已成功提交！Dify 回應: ' + JSON.stringify(data.answer || data));
            // 提交成功後，清空輸入欄位
            if (userInputElement) userInputElement.value = '';
        } else {
            alert('❌ 提交失敗，伺服器錯誤: ' + (data.error ? data.error.message : '未知錯誤'));
            console.error('伺服器錯誤回應:', data);
        }

    } catch (error) {
        console.error('網路連線或代理錯誤:', error);
        alert('❌ 連線失敗。請確認 Node.js 和 Ngrok 服務皆已啟動並指向正確埠號。');
    }
}
