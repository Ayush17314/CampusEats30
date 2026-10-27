import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true
});

/**
 * Assignment 3: External SOAP Partner Integration Client
 * Simulates the institutional banking SOAP gateway binding.
 */
export class SoapPartnerClient {
  constructor(endpointUrl = 'https://payment.iiitv.ac.in/soap/v1/gateway') {
    this.endpointUrl = endpointUrl;
  }

  buildChargeSoapEnvelope({ orderReference, studentId, amountInr, paymentMethod }) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:gate="https://payment.iiitv.ac.in/soap/gateway">
  <soap:Header>
    <gate:SecurityToken>
      <gate:ApiKey>campus_secret_live_key_9981</gate:ApiKey>
      <gate:CampusMerchantId>IIITV_CANTEEN_01</gate:CampusMerchantId>
    </gate:SecurityToken>
  </soap:Header>
  <soap:Body>
    <gate:ChargeRequest>
      <gate:orderReference>${orderReference}</gate:orderReference>
      <gate:studentId>${studentId}</gate:studentId>
      <gate:amountInr>${amountInr.toFixed(2)}</gate:amountInr>
      <gate:paymentMethod>${paymentMethod}</gate:paymentMethod>
    </gate:ChargeRequest>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Invokes the SOAP Partner gateway.
   * If card fails (e.g. mock test case paymentMethod === 'DECLINE_TEST'),
   * returns a realistic SOAP Fault mapped into clean contract vocabulary.
   */
  async invokeCharge({ orderReference, studentId, amountInr, paymentMethod }) {
    const soapEnvelope = this.buildChargeSoapEnvelope({ orderReference, studentId, amountInr, paymentMethod });

    // Simulate deliberate decline test case
    if (paymentMethod === 'DECLINE_TEST') {
      const soapFaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Payment instrument was declined by issuer bank.</faultstring>
      <detail>
        <PaymentFault>
          <errorCode>card_declined</errorCode>
          <reason>Insufficient balance or unauthorized card limit exceeded.</reason>
        </PaymentFault>
      </detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;

      const parsed = parser.parse(soapFaultXml);
      const fault = parsed.Envelope.Body.Fault;
      const partnerErrorCode = fault.detail?.PaymentFault?.errorCode || 'unknown_fault';

      // Assignment 3 Task 6: Fault Mapping Across the Boundary
      // Partner's card_declined -> CampusEats "payment declined"
      return {
        success: false,
        isFault: true,
        soapFaultCode: fault.faultcode,
        partnerErrorCode,
        mappedErrorMessage: partnerErrorCode === 'card_declined' 
          ? 'Payment declined by payment gateway' 
          : 'Payment processing error'
      };
    }

    // Happy path response
    const txnId = `txn-soap-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    return {
      success: true,
      transactionId: txnId,
      status: 'CAPTURED',
      authCode: `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString()
    };
  }
}

export const soapPartnerClient = new SoapPartnerClient();
