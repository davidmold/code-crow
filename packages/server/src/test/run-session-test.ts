#!/usr/bin/env node

import { MockAgent } from './mock-agent.js';
import { SessionContinuityTest } from './session-continuity-test.js';

async function runCompleteSessionTest(): Promise<void> {
  console.log('🚀 Starting Complete Session Continuity Test');
  console.log('==============================================\n');

  let mockAgent: MockAgent | null = null;
  let testClient: SessionContinuityTest | null = null;

  try {
    // Step 1: Start mock agent
    console.log('📋 Step 1: Starting Mock Agent...');
    mockAgent = new MockAgent();
    await mockAgent.connect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Mock Agent is ready\n');

    // Step 2: Start test client
    console.log('📋 Step 2: Starting Test Client...');
    testClient = new SessionContinuityTest();
    await testClient.connect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Test Client is ready\n');

    // Step 3: Send initial question
    console.log('📋 Step 3: Sending Initial Question...');
    console.log('Question: "how many planets do we have in this sim?"');
    await testClient.sendInitialQuestion();
    
    console.log('⏳ Waiting for initial response...');
    await testClient.waitForResponse(10000);
    console.log('✅ Initial response received!\n');

    // Step 4: Wait and send follow-up
    console.log('📋 Step 4: Sending Follow-up Question...');
    console.log('Question: "And which should we add next?"');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clear responses for second question
    const session = testClient.getSession();
    if (session) {
      session.responses = []; // Clear to wait for new response
    }
    
    await testClient.sendFollowUpQuestion();
    
    console.log('⏳ Waiting for follow-up response...');
    await testClient.waitForResponse(10000);
    console.log('✅ Follow-up response received!\n');

    // Step 5: Print detailed results
    console.log('📋 Step 5: Test Results');
    console.log('========================');
    testClient.printSessionSummary();
    
    // Analysis
    const sessionData = testClient.getSession();
    if (sessionData) {
      console.log('\n🔍 ANALYSIS:');
      console.log('=============');
      
      if (sessionData.claudeSessionId) {
        console.log('✅ SUCCESS: Claude session ID was captured and available for continuation');
        console.log(`   Claude Session ID: ${sessionData.claudeSessionId}`);
      } else {
        console.log('❌ FAILURE: Claude session ID was NOT captured - this prevents conversation continuation');
      }
      
      if (sessionData.responses.length >= 2) {
        console.log(`✅ SUCCESS: Received ${sessionData.responses.length} responses (both questions answered)`);
      } else {
        console.log(`❌ FAILURE: Only received ${sessionData.responses.length} response(s) - expected 2`);
      }

      // Check if follow-up makes sense contextually
      const responses = sessionData.responses;
      if (responses.length >= 2) {
        const followUpResponse = responses[responses.length - 1];
        const contextualWords = ['pluto', 'dwarf', 'asteroid', 'ceres', 'europa', 'titan', 'add', 'next'];
        const hasContext = contextualWords.some(word => 
          followUpResponse?.toLowerCase().includes(word)
        );
        
        if (hasContext) {
          console.log('✅ SUCCESS: Follow-up response appears contextually relevant');
        } else {
          console.log('⚠️  WARNING: Follow-up response may not be contextually relevant');
        }
      }
    }
    
    console.log('\n🎉 Session continuity test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    
    if (testClient) {
      console.log('\n📋 Partial Results:');
      testClient.printSessionSummary();
    }
    
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (testClient) {
      testClient.disconnect();
    }
    if (mockAgent) {
      mockAgent.disconnect();
    }
  }
}

// Check if server is running
async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/api/health');
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    console.log('❌ Server is not running at http://localhost:8080');
    console.log('Please start the server with: npm run dev:server');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  await runCompleteSessionTest();
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { runCompleteSessionTest };