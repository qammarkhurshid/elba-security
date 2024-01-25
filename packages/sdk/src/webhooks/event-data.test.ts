import { describe, expect, test } from 'vitest';
import { ElbaError } from '../error';
import { parseWebhookEventData } from './event-data';

describe('parseWebhookEventData', () => {
  describe('data_protection.scan_triggered',() => {
    test('should throw when the payload is invalid', () => {
      const data = { foo: 'bar' };
      const setup = () => parseWebhookEventData('data_protection.scan_triggered', data);
  
      expect(setup).toThrowError(ElbaError);
      expect(setup).toThrowError('Could not validate webhook event data');
    });
  
    test('should returns the event data when the payload is valid', () => {
      const data = { organisationId: '139ed8eb-2f8c-4784-b330-019d57737f06', someExtraData: 'foo' };
      const result = parseWebhookEventData('data_protection.scan_triggered', data);
  
      expect(result).toStrictEqual({ organisationId: data.organisationId });
    });
  
    test('should returns the event data when the data is instance of URLSearchParams and is valid', () => {
      const data = new URLSearchParams({
        organisationId: '139ed8eb-2f8c-4784-b330-019d57737f06',
        someExtraData: 'foo',
      });
      const result = parseWebhookEventData('data_protection.scan_triggered', data);
  
      expect(result).toStrictEqual({ organisationId: data.get('organisationId') });
    });
  })

  describe('third_party_apps.refresh_requested',() => {
    test('should throw when the payload is invalid', () => {
      const data = { foo: 'bar' };
      const setup = () => parseWebhookEventData('third_party_apps.refresh_requested', data);
  
      expect(setup).toThrowError(ElbaError);
      expect(setup).toThrowError('Could not validate webhook event data');
    });
  
    test('should returns the event data when the payload is valid', () => {
      const data = { organisationId: '00000000-0000-0000-0000-000000000001', userId: 'user-id', appId: 'app-id', metadata: { someExtraData: 'foo'} };
      const result = parseWebhookEventData('third_party_apps.refresh_requested', data);
  
      expect(result).toStrictEqual({ organisationId: data.organisationId, userId: data.userId, appId: data.appId, metadata:  data.metadata});
    });
  })

  describe('third_party_apps.delete_requested',() => {
    test('should throw when the payload is invalid', () => {
      const data = { foo: 'bar' };
      const setup = () => parseWebhookEventData('third_party_apps.delete_requested', data);
  
      expect(setup).toThrowError(ElbaError);
      expect(setup).toThrowError('Could not validate webhook event data');
    });
  
    test('should returns the event data when the payload is valid', () => {
      const data = { organisationId: '00000000-0000-0000-0000-000000000001', userId: 'user-id', appId: 'app-id', metadata: { someExtraData: 'foo'} };
      const result = parseWebhookEventData('third_party_apps.delete_requested', data);
  
      expect(result).toStrictEqual({ organisationId: data.organisationId, userId: data.userId, appId: data.appId, metadata:  data.metadata});
    });
  })
});
