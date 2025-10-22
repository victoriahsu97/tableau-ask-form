document.addEventListener('DOMContentLoaded', function() {
    const questionForm = document.getElementById('questionForm');
    const statusDiv = document.getElementById('status');
    const debugDiv = document.getElementById('debugInfo');
    
    // 從 Tableau 嵌入 URL 中獲取參數
    const urlParams = new URLSearchParams(window.location.search);
    
    // 重要：這些變數名稱必須與 Tableau URL 中設定的變數名稱一致
    // 假設 Tableau URL 傳遞了 'userName' 和 'dashboardName'
    const tableauUser = urlParams.get('userName') || 'Unknown User'; 
    const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard';
    
    // 將獲取的參數填入隱藏欄位 (可供提交，且方便除錯)
    document.getElementById('tableauUser').value = tableauUser;
    document.getElementById('dashboardId').value = dashboardId;

    // 顯示除錯資訊（可選，但建議保留）
    debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;
    
    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 替換成實際的 Make Webhook URL
        const webhookUrl = 'https://hook.eu2.make.com/wrnm5qliiouoljktae9nqgq9z2lkm4m5';
        
        // 從表單中獲取最終數據
        const payload = {
            question_text: document.getElementById('question').value,
            department_id: document.getElementById('dept').value,
            // 傳送 Tableau 擷取到的 ID
            dashboard_id: dashboardId, 
            tableau_user: tableauUser
        };
        
        statusDiv.innerHTML = '正在發送...';

        // 使用 Fetch API 發送 POST 請求到 Make Webhook
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
        .then(response => {
            if (!response.ok) {
                // 如果 Make 返回非 2xx 狀態碼
                throw new Error('Webhook 處理失敗');
            }
            return response.json(); // 或 response.text(), 取決於你的 Webhook Response 設定
        })
        .then(data => {
            statusDiv.innerHTML = '✅ 問題已成功提交並傳送到 Slack！';
            questionForm.reset();
        })
        .catch(error => {
            console.error('Submission Error:', error);
            statusDiv.innerHTML = '❌ 提交失敗，請檢查網路或聯繫 IT。';
        });
    });
});
