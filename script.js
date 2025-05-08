  const firebaseConfig = {
      apiKey: "AIzaSyA7S0DeNhibbkcq8XXw3fTS_88hDPrfhxw",
      authDomain: "aziz-891ae.firebaseapp.com",
      databaseURL: "https://aziz-891ae-default-rtdb.firebaseio.com",
      projectId: "aziz-891ae",
      storageBucket: "aziz-891ae.appspot.com",
      messagingSenderId: "399625100592",
      appId: "1:399625100592:web:cb27b69a941e88b341bcf5",
      measurementId: "G-JSD432PEB7"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    const employeeNameInput = document.getElementById("employeeName");
    const employeePhoneInput = document.getElementById("employeePhone");
    const dailyAmountInput = document.getElementById("dailyAmount");
    const searchNameInput = document.getElementById("searchName");
    const employeeTable = document.getElementById("employeeTable");
    const employeeTableBody = document.getElementById("employeeTableBody");
    const selectedEmployeeInfo = document.getElementById("selectedEmployeeInfo");
    const selectedEmployeeName = document.getElementById("selectedEmployeeName");
    const selectedEmployeeBalance = document.getElementById("selectedEmployeeBalance");
    const balanceChangeInput = document.getElementById("balanceChange");
    const activityLogTableBody = document.getElementById("activityLogTableBody");
    const companyRevenueDisplay = document.getElementById("companyRevenueDisplay");
    const companyRevenueAmount = document.getElementById("companyRevenueAmount");
    const bulkAmountInput = document.getElementById("bulkAmount");

    let selectedEmployeeId = null;

    function toggleSidebar() {
      document.getElementById("sidebar").classList.toggle("open");
    }

    function hideAllSections() {
      document.getElementById("addEmployeeSection").classList.add("hidden");
      document.getElementById("searchEmployeeSection").classList.add("hidden");
      document.getElementById("balanceManagementSection").classList.add("hidden");
      document.getElementById("bulkBalanceSection").classList.add("hidden");
      document.getElementById("sendSalariesSection").classList.add("hidden");
      document.getElementById("activityLogSection").classList.add("hidden");
      document.getElementById("companyRevenuesSection").classList.add("hidden");
      employeeTable.classList.add("hidden");
      selectedEmployeeInfo.classList.add("hidden");
    }

    function showSection(sectionId) {
      // إغلاق الشريط الجانبي أولاً
      document.getElementById("sidebar").classList.remove("open");
      
      // إخفاء جميع الأقسام ثم إظهار القسم المطلوب
      hideAllSections();
      document.getElementById(sectionId).classList.remove("hidden");
      
      // بعض الأقسام تحتاج إلى تحميل بيانات إضافية
      switch(sectionId) {
        case 'searchEmployeeSection':
          employeeTable.classList.remove("hidden");
          displayEmployeeList();
          break;
        case 'activityLogSection':
          displayActivityLog();
          break;
        case 'companyRevenuesSection':
          displayCompanyRevenue();
          break;
      }
    }

    function addEmployee() {
      const name = employeeNameInput.value.trim();
      const phone = employeePhoneInput.value.trim();
      const dailyAmount = parseFloat(dailyAmountInput.value);

      if (name && phone && !isNaN(dailyAmount)) {
        const newEmployeeRef = db.ref("employees").push();
        const id = newEmployeeRef.key;

        newEmployeeRef.set({
          id: id,
          name: name,
          phone: phone,
          type: "عادي",
          balance: 0,
          dailyAmount: dailyAmount
        }).then(() => {
          alert("تمت الإضافة!");
          employeeNameInput.value = "";
          employeePhoneInput.value = "";
          dailyAmountInput.value = "";
          logActivity(`تمت إضافة الموظف: ${name}`);
        });
      } else {
        alert("يرجى إدخال الاسم ورقم الهاتف والمبلغ اليومي.");
      }
    }

    function displayEmployeeList() {
      employeeTableBody.innerHTML = "";
      db.ref("employees").once("value", snapshot => {
        snapshot.forEach(child => {
          const emp = child.val();
          const row = document.createElement("tr");

          const typeButton = document.createElement("button");
          typeButton.textContent = emp.type;
          typeButton.style.backgroundColor = emp.type === "مميز" ? "red" : "";
          typeButton.onclick = function () {
            const newType = emp.type === "مميز" ? "عادي" : "مميز";
            const nameCell = row.cells[0];
            nameCell.style.color = newType === "مميز" ? "red" : "";

            db.ref("employees/" + child.key).update({
              type: newType
            }).then(() => {
              typeButton.textContent = newType;
              typeButton.style.backgroundColor = newType === "مميز" ? "red" : "";
            });
          };

          row.innerHTML = `
            <td>${emp.name}</td>
            <td>${emp.balance}</td>
            <td>${emp.id}</td>
            <td>${emp.phone}</td>
            <td></td>
            <td><button onclick="openBalanceManagement('${child.key}')">إدارة الرصيد</button></td>
          `;
          row.cells[4].appendChild(typeButton);
          employeeTableBody.appendChild(row);
        });
      });
    }

    function openBalanceManagement(employeeId) {
      selectedEmployeeId = employeeId;
      hideAllSections();
      document.getElementById("balanceManagementSection").classList.remove("hidden");

      db.ref("employees/" + selectedEmployeeId).once("value", snapshot => {
        const emp = snapshot.val();
        selectedEmployeeName.textContent = `اسم الموظف: ${emp.name}`;
        selectedEmployeeBalance.textContent = `الرصيد الحالي: ${emp.balance}`;
        selectedEmployeeInfo.classList.remove("hidden");
      });
    }

    function updateBalance(action) {
      const amount = parseFloat(balanceChangeInput.value);
      if (isNaN(amount) || amount <= 0) {
        alert("يرجى إدخال قيمة صحيحة.");
        return;
      }

      const employeeRef = db.ref("employees/" + selectedEmployeeId);
      const companyRevenueRef = db.ref("companyRevenue");

      employeeRef.once("value", snapshot => {
        const emp = snapshot.val();
        let newBalance = emp.balance;

        if (action === "increase") {
          newBalance += amount;
          const currentTimestamp = new Date().toISOString();
          employeeRef.update({
            balance: newBalance,
            lastBalanceUpdate: currentTimestamp
          }).then(() => {
            logActivity(`تمت زيادة الرصيد للموظف ${emp.name} بمقدار ${amount}`);
          });
        } else if (action === "decrease") {
          if (newBalance >= amount) {
            newBalance -= amount;
            logActivity(`تم خصم مبلغ ${amount} من رصيد الموظف ${emp.name}`);

            companyRevenueRef.once("value", snapshot => {
              const currentRevenue = snapshot.val() || 0;
              const newRevenue = currentRevenue - amount;

              if (newRevenue < 0) {
                alert("إيرادات الشركة غير كافية.");
                return;
              }

              companyRevenueRef.set(newRevenue).then(() => {
                logActivity(`تم خصم مبلغ ${amount} من إيرادات الشركة`);
              });
            });
          } else {
            alert("الرصيد غير كافٍ.");
            return;
          }
        }

        employeeRef.update({ balance: newBalance }).then(() => {
          selectedEmployeeBalance.textContent = `الرصيد الحالي: ${newBalance}`;
          balanceChangeInput.value = "";
        });
      });
    }

    function addBulkBalance() {
      const amount = parseFloat(bulkAmountInput.value);
      
      if (isNaN(amount) || amount <= 0) {
        alert("يرجى إدخال قيمة صحيحة.");
        return;
      }

      if (!confirm(`هل أنت متأكد من رغبتك في إضافة ${amount} إلى رصيد جميع الموظفين؟`)) {
        return;
      }

      db.ref("employees").once("value", snapshot => {
        const updates = {};
        const timestamp = new Date().toISOString();
        
        snapshot.forEach(child => {
          const emp = child.val();
          const newBalance = (emp.balance || 0) + amount;
          updates[`employees/${child.key}/balance`] = newBalance;
          updates[`employees/${child.key}/lastBalanceUpdate`] = timestamp;
        });

        db.ref().update(updates).then(() => {
          alert(`تمت إضافة ${amount} إلى رصيد جميع الموظفين بنجاح!`);
          bulkAmountInput.value = "";
          logActivity(`تمت إضافة ${amount} إلى رصيد جميع الموظفين`);
          displayEmployeeList();
        }).catch(error => {
          console.error("Error updating balances:", error);
          alert("حدث خطأ أثناء تحديث الأرصدة");
        });
      });
    }

    function sendSalaries() {
      if (!confirm("هل أنت متأكد من رغبتك في إرسال رواتب جميع الموظفين حسب المبلغ اليومي لكل موظف؟")) {
        return;
      }

      db.ref("employees").once("value", snapshot => {
        const updates = {};
        const timestamp = new Date().toISOString();
        let totalSalaries = 0;
        let employeesCount = 0;
        
        snapshot.forEach(child => {
          const emp = child.val();
          const dailyAmount = emp.dailyAmount || 0;
          
          if (dailyAmount > 0) {
            const newBalance = (emp.balance || 0) + dailyAmount;
            updates[`employees/${child.key}/balance`] = newBalance;
            updates[`employees/${child.key}/lastBalanceUpdate`] = timestamp;
            totalSalaries += dailyAmount;
            employeesCount++;
          }
        });

        if (employeesCount === 0) {
          alert("لا يوجد موظفين لديهم مبلغ يومي محدد");
          return;
        }

        db.ref().update(updates).then(() => {
          alert(`تم إرسال الرواتب لـ ${employeesCount} موظفين بنجاح! المجموع الكلي: ${totalSalaries}`);
          logActivity(`تم إرسال الرواتب لـ ${employeesCount} موظفين - المجموع الكلي: ${totalSalaries}`);
          displayEmployeeList();
        }).catch(error => {
          console.error("Error sending salaries:", error);
          alert("حدث خطأ أثناء إرسال الرواتب");
        });
      });
    }

    function autoAddBalance() {
      db.ref("employees").once("value", snapshot => {
        snapshot.forEach(child => {
          const emp = child.val();
          const dailyAmount = emp.dailyAmount || 0;
          const employeeRef = db.ref("employees/" + child.key);

          if (dailyAmount > 0) {
            const lastUpdateTimestamp = emp.lastBalanceUpdate || new Date().toISOString();
            const currentDate = new Date().toISOString().split('T')[0];
            const lastUpdateDate = new Date(lastUpdateTimestamp).toISOString().split('T')[0];

            if (currentDate !== lastUpdateDate) {
              let newBalance = emp.balance + dailyAmount;

              employeeRef.update({
                balance: newBalance,
                lastBalanceUpdate: currentDate
              }).then(() => {
                logActivity(`تم إضافة ${dailyAmount} إلى رصيد الموظف ${emp.name} بناءً على مرور يوم كامل`);
              });
            }
          }
        });
      });
    }

    setInterval(autoAddBalance, 24 * 60 * 60 * 1000);

    function displayActivityLog() {
      activityLogTableBody.innerHTML = "";
      db.ref("activityLog").once("value", snapshot => {
        snapshot.forEach(child => {
          const log = child.val();
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.activity}</td>
          `;
          activityLogTableBody.appendChild(row);
        });
      });
    }

    function logActivity(activity) {
      const timestamp = new Date().toLocaleString();
      const newLogRef = db.ref("activityLog").push();
      newLogRef.set({ timestamp: timestamp, activity: activity });
    }

    function displayCompanyRevenue() {
      db.ref("companyRevenue").once("value", snapshot => {
        const revenue = snapshot.val() || 0;
        companyRevenueDisplay.textContent = `إيرادات الشركة: ${revenue.toLocaleString()}`;
      });
    }

    function updateCompanyRevenue(action) {
      const amount = parseFloat(companyRevenueAmount.value);
      if (isNaN(amount) || amount <= 0) {
        alert("يرجى إدخال قيمة صحيحة.");
        return;
      }

      const companyRevenueRef = db.ref("companyRevenue");
      companyRevenueRef.once("value", snapshot => {
        const currentRevenue = snapshot.val() || 0;
        let newRevenue = currentRevenue;

        if (action === "increase") {
          newRevenue += amount;
          logActivity(`تمت إضافة مبلغ ${amount} إلى إيرادات الشركة`);
        } else if (action === "decrease") {
          if (newRevenue >= amount) {
            newRevenue -= amount;
            logActivity(`تم خصم مبلغ ${amount} من إيرادات الشركة`);
          } else {
            alert("إيرادات الشركة غير كافية.");
            return;
          }
        }

        companyRevenueRef.set(newRevenue).then(() => {
          companyRevenueDisplay.textContent = `إيرادات الشركة: ${newRevenue.toLocaleString()}`;
          companyRevenueAmount.value = "";
        });
      });
    }

    function searchEmployee() {
      const searchText = searchNameInput.value.toLowerCase();
      const rows = employeeTableBody.getElementsByTagName("tr");

      for (let row of rows) {
        const nameCell = row.cells[0];
        const balanceCell = row.cells[1];
        const idCell = row.cells[2];
        const phoneCell = row.cells[3];

        const name = nameCell.textContent.toLowerCase();
        const id = idCell.textContent.toLowerCase();
        const phone = phoneCell.textContent.toLowerCase();

        if (name.includes(searchText) || id.includes(searchText) || phone.includes(searchText)) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      }
    }

    window.onload = function () {
      hideAllSections();
      displayEmployeeList();
