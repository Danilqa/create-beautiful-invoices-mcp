import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { FONT_FAMILIES } from './fonts';
import { formatLongDate, formatMoney } from './format';
import type { Logo } from './logo';
import { toPaymentFields } from './payment';
import { calculateTotals } from './totals';
import type { Invoice } from './types';

const INK = '#0a0a0a';
const MUTED = '#737373';
const HAIRLINE = '#e5e5e5';
const DEFAULT_TAX_LABEL = 'VAT';

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILIES,
    fontSize: 9,
    lineHeight: 1.45,
    color: INK,
    paddingTop: 52,
    paddingHorizontal: 52,
    paddingBottom: 72,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { maxWidth: 160, maxHeight: 32, objectFit: 'contain' },
  sellerName: { fontWeight: 600 },
  muted: { color: MUTED },
  amountLabel: { marginTop: 48, color: MUTED },
  amountDue: { fontSize: 44, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.1 },
  dueDate: { marginTop: 4, color: MUTED },
  parties: {
    flexDirection: 'row',
    marginTop: 36,
    paddingTop: 18,
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
  },
  party: { flex: 1, paddingRight: 16 },
  dates: { width: 110 },
  label: { color: MUTED, marginBottom: 4 },
  secondLabel: { color: MUTED, marginTop: 8, marginBottom: 4 },
  items: { marginTop: 32 },
  itemsHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
    color: MUTED,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
  },
  description: { flex: 1, paddingRight: 12 },
  quantity: { width: 50, textAlign: 'right' },
  price: { width: 80, textAlign: 'right' },
  totals: { marginLeft: '55%', marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    color: MUTED,
  },
  grandTotal: { fontWeight: 600 },
  notes: { marginTop: 32 },
  payment: { marginTop: 32, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16 },
  paymentTitle: { fontWeight: 600 },
  paymentFields: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  paymentField: { width: '50%', marginBottom: 8, paddingRight: 12 },
  paymentValue: { fontWeight: 500 },
});

interface LinesProps {
  lines: (string | undefined)[];
}

const Lines = ({ lines }: LinesProps) =>
  lines
    .flatMap(line => line?.split('\n') ?? [])
    .map((line, index) => <Text key={index}>{line}</Text>);

export interface InvoiceDocumentProps {
  invoice: Invoice;
  logo: Logo | undefined;
}

export const InvoiceDocument = ({ invoice, logo }: InvoiceDocumentProps) => {
  const { seller, client, currency } = invoice;
  const { lines, subtotalMinor, discountMinor, taxMinor, totalMinor } = calculateTotals(invoice);
  const taxLabel = invoice.taxLabel ?? DEFAULT_TAX_LABEL;
  const toMoney = (amountMinor: number) => formatMoney(amountMinor, currency);
  const issueDate = formatLongDate(invoice.issueDate);
  const dueDate = formatLongDate(invoice.dueDate);

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={seller.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logo === undefined ? (
            <Text style={styles.sellerName}>{seller.name}</Text>
          ) : (
            <Image style={styles.logo} src={logo} />
          )}
          <Text style={styles.muted}>Invoice {invoice.invoiceNumber}</Text>
        </View>

        <Text style={styles.amountLabel}>Amount due</Text>
        <Text style={styles.amountDue}>{toMoney(totalMinor)}</Text>
        <Text style={styles.dueDate}>Due {dueDate}</Text>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>Billed to</Text>
            <Lines lines={[client.name, client.address, client.email]} />
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>From</Text>
            <Lines
              lines={[
                seller.name,
                seller.address,
                seller.email,
                seller.phone,
                seller.taxNumber === undefined ? undefined : `${taxLabel} ${seller.taxNumber}`,
              ]}
            />
          </View>
          <View style={styles.dates}>
            <Text style={styles.label}>Issued</Text>
            <Text>{issueDate}</Text>
            <Text style={styles.secondLabel}>Due</Text>
            <Text>{dueDate}</Text>
          </View>
        </View>

        <View style={styles.items}>
          <View style={styles.itemsHeader}>
            <Text style={styles.description}>Description</Text>
            <Text style={styles.quantity}>Qty</Text>
            <Text style={styles.price}>Price</Text>
            <Text style={styles.price}>Amount</Text>
          </View>
          {lines.map((line, index) => (
            <View key={index} style={styles.itemRow} wrap={false}>
              <Text style={styles.description}>{line.description}</Text>
              <Text style={styles.quantity}>{line.quantity}</Text>
              <Text style={styles.price}>{toMoney(line.unitPriceMinor)}</Text>
              <Text style={styles.price}>{toMoney(line.amountMinor)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.subtotalRow}>
            <Text>Subtotal</Text>
            <Text>{toMoney(subtotalMinor)}</Text>
          </View>
          {invoice.discountRate !== undefined && invoice.discountRate > 0 && (
            <View style={styles.subtotalRow}>
              <Text>Discount ({invoice.discountRate}%)</Text>
              <Text>−{toMoney(discountMinor)}</Text>
            </View>
          )}
          {invoice.taxRate !== undefined && invoice.taxRate > 0 && (
            <View style={styles.subtotalRow}>
              <Text>
                {taxLabel} ({invoice.taxRate}%)
              </Text>
              <Text>{toMoney(taxMinor)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{toMoney(totalMinor)}</Text>
          </View>
        </View>

        {invoice.notes !== undefined && (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Lines lines={[invoice.notes]} />
          </View>
        )}

        <View style={styles.payment} wrap={false}>
          <Text style={styles.paymentTitle}>Pay by bank transfer</Text>
          <View style={styles.paymentFields}>
            {toPaymentFields(invoice).map(({ label, value }) => (
              <View key={label} style={styles.paymentField}>
                <Text style={styles.muted}>{label}</Text>
                <Text style={styles.paymentValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
};
