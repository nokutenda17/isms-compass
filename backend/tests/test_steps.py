import pytest
import json
from .conftest import login

def test_completing_step_1_unlocks_step_2(seeded_client):
    client, creds = seeded_client
    token = login(client, creds['email'], creds['password'])
    headers = {'Authorization': f"Bearer {token}"}

    # Verify initial state: step 1 is In Progress, step 2 is Not Started
    res = client.get('/api/steps', headers=headers)
    steps = res.get_json()
    assert steps[0]['status'] == 'In Progress'
    assert steps[1]['status'] == 'Not Started'

    # Complete step 1
    res = client.post('/api/steps/1/complete', json={'data': 'val'}, headers=headers)
    assert res.status_code == 200

    # Verify new state: step 1 is Complete, step 2 is In Progress
    res = client.get('/api/steps', headers=headers)
    steps = res.get_json()
    assert steps[0]['status'] == 'Complete'
    assert steps[1]['status'] == 'In Progress'

def test_draft_data_is_persisted_and_returned(seeded_client):
    client, creds = seeded_client
    token = login(client, creds['email'], creds['password'])
    headers = {'Authorization': f"Bearer {token}"}

    # Save draft data for step 1
    draft_payload = {'field1': 'value1', 'field2': 42}
    res = client.patch('/api/steps/1/draft', json=draft_payload, headers=headers)
    assert res.status_code == 200
    
    # Retrieve step 1 and verify draft data is returned
    res = client.get('/api/steps/1', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert 'draft_data' in data
    assert data['draft_data']['field1'] == 'value1'
    assert data['draft_data']['field2'] == 42

def test_locked_step_cannot_be_completed_out_of_order(seeded_client):
    client, creds = seeded_client
    token = login(client, creds['email'], creds['password'])
    headers = {'Authorization': f"Bearer {token}"}

    # Attempt to complete step 3, which should be locked since step 1 & 2 are not done
    res = client.post('/api/steps/3/complete', json={'data': 'val'}, headers=headers)
    
    # The endpoint returns a 400 when attempting to complete a locked step out of order
    assert res.status_code == 400
    assert 'locked' in res.get_json()['error'].lower()
