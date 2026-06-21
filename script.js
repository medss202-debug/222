import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoshyzju1pEhR-9ZVgvaNZXzDzn5Rn-t4",
  authDomain: "project-5032938748792409729.firebaseapp.com",
  projectId: "project-5032938748792409729",
  storageBucket: "project-5032938748792409729.firebasestorage.app",
  messagingSenderId: "11260285119",
  appId: "1:11260285119:web:08d63ee844e03db96a760a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];
let orders = [];

// ضغط الصورة وتحويلها لـ Base64 (رابط طويل)
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.4));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

const tabProducts = document.getElementById('tab-products');
const tabOrders = document.getElementById('tab-orders');
const viewProducts = document.getElementById('view-products');
const viewOrders = document.getElementById('view-orders');
const productsList = document.getElementById('admin-products-list');
const ordersList = document.getElementById('admin-orders-list');

tabProducts.addEventListener('click', () => {
    tabProducts.classList.add('active'); tabOrders.classList.remove('active');
    viewProducts.classList.add('active'); viewOrders.classList.remove('active');
});
    
tabOrders.addEventListener('click', () => {
    tabOrders.classList.add('active'); tabProducts.classList.remove('active');
    viewOrders.classList.add('active'); viewProducts.classList.remove('active');
});

// استماع مباشر للمنتجات من فايربيس
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snapshot) => {
    products = [];
    snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
    });
    renderProducts();
});

// استماع مباشر للطلبات من فايربيس
onSnapshot(query(collection(db, "orders"), orderBy("date", "desc")), (snapshot) => {
    orders = [];
    snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
    });
    renderOrders();
});

function renderProducts() {
    productsList.innerHTML = '';
    if (products.length === 0) {
        productsList.innerHTML = '<p style="text-align:center; color:#888; padding: 20px;">لا توجد منتجات حالياً.</p>';
        return;
    }
    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <img src="${p.img}" alt="Product">
            <div class="info">
                <div class="desc">${p.desc}</div>
                <div class="actions">
                    <button class="btn-icon" onclick="window.openEditModal('${p.id}')">✏️</button>
                    <button class="btn-icon" onclick="window.deleteProduct('${p.id}')">🗑️</button>
                </div>
            </div>
        `;
        productsList.appendChild(item);
    });
}

function renderOrders() {
    ordersList.innerHTML = '';
    if (orders.length === 0) {
        ordersList.innerHTML = '<p style="text-align:center; color:#888; padding: 20px;">لا توجد طلبات حالياً.</p>';
        return;
    }

    orders.forEach(o => {
        const item = document.createElement('div');
        item.className = 'order-card';
        const d = new Date(o.date);
        item.innerHTML = `
            <div class="order-header">
                <strong>طلب جديد</strong>
                <span>⏱️ ${d.toLocaleDateString("ar-IQ", {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="order-product">
                <img src="${o.productImg}">
                <div>
                    <strong>تفاصيل المنتجات:</strong>
                    <p style="margin-top:5px; font-size:14px;">${o.productDesc}</p>
                </div>
            </div>
            <div class="order-info">
                <p>👤 <b>الاسم:</b> ${o.name}</p>
                <p>📞 <b>الرقم:</b> <span dir="ltr">${o.phone}</span></p>
                <p>📍 <b>المحافظة:</b> ${o.gov}</p>
                <p>🏠 <b>نقطة دالة:</b> ${o.address}</p>
            </div>
            <div class="order-actions">
                <button class="btn-success btn-accept-order" onclick="window.acceptOrder('${o.id}')">قبول ✔️</button>
                <button class="btn-danger btn-delete-order" onclick="window.deleteOrder('${o.id}')">حذف ❌</button>
            </div>
        `;
        ordersList.appendChild(item);
    });
}

window.acceptOrder = async function(id) {
    if(confirm('هل أنت متأكد من قبول الطلب؟ سيتم أرشفته والحذف من القائمة.')) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch(e) { alert("خطأ"); console.error(e); }
    }
}

window.deleteOrder = async function(id) {
    if(confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch(e) { alert("خطأ"); console.error(e); }
    }
}

window.deleteProduct = async function(id) {
    if(confirm('هل تريد حذف هذا المنتج فعلاً؟')) {
        try {
            await deleteDoc(doc(db, "products", id));
        } catch(e) { alert("خطأ"); console.error(e); }
    }
}

const modalAdd = document.getElementById('modal-add-product');
const modalEdit = document.getElementById('modal-edit-product');

document.getElementById('btn-show-add-product').addEventListener('click', () => {
    if (products.length >= 6) {
        return alert("احذف احد المنتجات قاعدة البيانات ممتلئة او رقي الخدمه");
    }
    document.getElementById('input-product-image').value = '';
    document.getElementById('input-product-desc').value = '';
    modalAdd.classList.add('show');
});

document.getElementById('btn-cancel-product').addEventListener('click', () => modalAdd.classList.remove('show'));
document.getElementById('btn-cancel-edit').addEventListener('click', () => modalEdit.classList.remove('show'));

document.getElementById('btn-save-product').addEventListener('click', async () => {
    if (products.length >= 6) {
        return alert("احذف احد المنتجات قاعدة البيانات ممتلئة او رقي الخدمه");
    }

    const fileInput = document.getElementById('input-product-image');
    const desc = document.getElementById('input-product-desc').value.trim();
    
    if(!fileInput.files[0] || !desc) return alert("الرجاء تعبئة جميع الحقول ورفع صورة");

    const btn = document.getElementById('btn-save-product');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    try {
        const compressedBase64 = await compressImage(fileInput.files[0]);
        await addDoc(collection(db, "products"), {
            img: compressedBase64,
            desc: desc,
            createdAt: Date.now()
        });
        modalAdd.classList.remove('show');
    } catch(e) {
        alert("حدث خطأ أثناء الحفظ");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ';
    }
});

window.openEditModal = function(id) {
    const p = products.find(prod => prod.id === id);
    if(p) {
        document.getElementById('edit-product-id').value = p.id;
        document.getElementById('edit-product-image').value = ''; 
        document.getElementById('edit-product-desc').value = p.desc;
        modalEdit.classList.add('show');
    }
}

document.getElementById('btn-update-product').addEventListener('click', async () => {
    const id = document.getElementById('edit-product-id').value;
    const fileInput = document.getElementById('edit-product-image');
    const desc = document.getElementById('edit-product-desc').value.trim();
    
    if(!desc) return alert("الرجاء تعبئة وصف المنتج");

    const btn = document.getElementById('btn-update-product');
    btn.disabled = true;
    btn.textContent = 'جاري التحديث...';

    try {
        const updates = { desc: desc };
        if (fileInput.files[0]) {
            updates.img = await compressImage(fileInput.files[0]);
        }
        await updateDoc(doc(db, "products", id), updates);
        modalEdit.classList.remove('show');
    } catch(e) {
        alert("حدث خطأ أثناء التحديث");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ التعديلات';
    }
});
