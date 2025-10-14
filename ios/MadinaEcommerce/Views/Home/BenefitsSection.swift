import SwiftUI

struct BenefitItem: Identifiable, Hashable {
    let id = UUID()
    let icon: String
    let title: LocalizedText
    let description: LocalizedText
}

struct BenefitsSection: View {
    let language: AppLanguage

    private var benefits: [BenefitItem] {
        [
            BenefitItem(icon: "shippingbox",
                        title: LocalizedText(ar: "توصيل سريع", he: "משלוח מהיר"),
                        description: LocalizedText(ar: "خدمة التوصيل تغطي الضفة الغربية وإسرائيل.",
                                                 he: "משלוח לכל הארץ והגדה.")),
            BenefitItem(icon: "sparkles",
                        title: LocalizedText(ar: "جودة مضمونة", he: "איכות מובטחת"),
                        description: LocalizedText(ar: "مواد معتمدة لصانعي الأثاث والنجارين.",
                                                 he: "חומרים מאושרים לרהיטים ונגרים.")),
            BenefitItem(icon: "creditcard",
                        title: LocalizedText(ar: "خيارات دفع مرنة", he: "אפשרויות תשלום"),
                        description: LocalizedText(ar: "ادفع نقداً عند الاستلام أو عبر التحويل.",
                                                 he: "תשלום במזומן או בהעברה בנקאית.")),
            BenefitItem(icon: "person.2.fill",
                        title: LocalizedText(ar: "دعم شخصي", he: "תמיכה אישית"),
                        description: LocalizedText(ar: "فريق خدمة العملاء يساعدك عبر الهاتف وواتساب.",
                                                 he: "צוות שירות הלקוחות זמין בטלפון ובווטסאפ."))
        ]
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 16) {
            Text("ماذا نقدّم")
                .font(.title2.bold())
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 2), spacing: 16) {
                ForEach(benefits) { benefit in
                    VStack(alignment: .trailing, spacing: 12) {
                        Image(systemName: benefit.icon)
                            .font(.largeTitle)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                        Text(benefit.title.value(for: language) ?? "")
                            .font(.headline)
                        Text(benefit.description.value(for: language) ?? "")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
                }
            }
        }
    }
}
