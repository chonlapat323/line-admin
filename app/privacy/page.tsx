export const metadata = {
  title: "นโยบายความเป็นส่วนตัว | BeautyUp Sales",
};

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", lineHeight: 1.8, color: "#1f2937" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>นโยบายความเป็นส่วนตัว</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>แอปพลิเคชัน BeautyUp Sales — ปรับปรุงล่าสุด 11 กันยายน 2569</p>

      <p style={{ marginBottom: 24 }}>
        แอป BeautyUp Sales เป็นเครื่องมือภายในสำหรับพนักงานขายของ BeautyUp Enterprise ใช้บันทึกข้อมูลการออกเยี่ยมร้านค้า
        ตรวจสอบยอดขาย และติดตามค่าคอมมิชชั่น นโยบายนี้อธิบายว่าเราเก็บ ใช้ และดูแลข้อมูลของผู้ใช้อย่างไร
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>ข้อมูลที่เราเก็บ</h2>
      <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
        <li><b>ข้อมูลบัญชี</b> — อีเมลและรหัสผ่านที่เข้ารหัส สำหรับเข้าสู่ระบบ</li>
        <li><b>ตำแหน่งที่ตั้ง (GPS)</b> — พิกัดขณะบันทึกการออกเยี่ยมร้านค้า เพื่อยืนยันสถานที่ปฏิบัติงานจริง</li>
        <li><b>รูปภาพ</b> — ภาพหน้าร้าน สลิปการชำระเงิน และหลักฐานการขายที่ผู้ใช้ถ่ายหรือเลือกอัปโหลดเอง</li>
        <li><b>ข้อมูลการทำงาน</b> — รายละเอียดทริป ยอดขาย ผลการเยี่ยมร้านค้า ที่ผู้ใช้กรอกในระบบ</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>เราใช้ข้อมูลอย่างไร</h2>
      <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
        <li>ยืนยันตัวตนผู้ใช้และควบคุมการเข้าถึงระบบ</li>
        <li>บันทึกและตรวจสอบผลการปฏิบัติงาน คำนวณค่าคอมมิชชั่น</li>
        <li>ตรวจสอบความถูกต้องของสลิปการชำระเงินเพื่อป้องกันการทุจริต</li>
        <li>ส่งการแจ้งเตือนผลการบันทึกทริปผ่าน LINE ให้ผู้เกี่ยวข้องภายในองค์กร</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>การแชร์ข้อมูล</h2>
      <p style={{ marginBottom: 24 }}>
        เราไม่ขายหรือแชร์ข้อมูลส่วนบุคคลให้บุคคลภายนอกเพื่อวัตถุประสงค์ทางการตลาด ข้อมูลจะถูกใช้ภายในองค์กร BeautyUp
        เท่านั้น ยกเว้นการส่งต่อไปยังผู้ให้บริการที่จำเป็นต่อการทำงานของระบบ เช่น บริการแจ้งเตือนผ่าน LINE
        และบริการตรวจสอบสลิปการชำระเงิน ซึ่งได้รับข้อมูลเท่าที่จำเป็นต่อการทำงานเท่านั้น
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>การเก็บรักษาข้อมูล</h2>
      <p style={{ marginBottom: 24 }}>
        ข้อมูลจะถูกเก็บไว้ตราบเท่าที่บัญชีผู้ใช้ยังใช้งานอยู่ในระบบ เพื่อวัตถุประสงค์ด้านการตรวจสอบและบันทึกประวัติการทำงาน
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>สิทธิ์ของผู้ใช้</h2>
      <p style={{ marginBottom: 24 }}>
        ผู้ใช้สามารถติดต่อผู้ดูแลระบบเพื่อขอเข้าถึง แก้ไข หรือขอให้ลบข้อมูลส่วนบุคคลของตนเองได้ตามช่องทางติดต่อด้านล่าง
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>ติดต่อเรา</h2>
      <p>
        หากมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ ติดต่อได้ที่{" "}
        <a href="mailto:support@beautyup-enterprise.com" style={{ color: "#16a34a" }}>
          support@beautyup-enterprise.com
        </a>
      </p>
    </main>
  );
}
