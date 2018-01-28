// GGJ 2018
// Project TCG - Logic Implementation
// by Debugger


////////////////////////////////////////////////////////////////////////////////
// Logic Module
////////////////////////////////////////////////////////////////////////////////
var TCGLogic = {
	
	Types: {
		NodeId: {
			// Special Ids
			START: -1, 
			GOAL: -2, 
			GLOBAL_INPUT_X: -10, 
			GLOBAL_INPUT_Y: -11, 
			
			// Type Functions
			ToNodeIndex: function (id) {
				if (id < 0)
				{
					return null;
				}
				return id;
			},
			
			IsNormalNode: function(id) {
				return (id >= 0);
			}
		}, 
		PresentatioEventType: {
			// Values
			PROCESS: 1, 
			OUTPUT: 2
		}, 
		FunctionInfoType: {
			// Values
			BLACK_BOX: 0, 
			PASS: 1, 
			BLOCK: 2, 
			EMPTY: 3, 
			WORD: 10, 
			EXACT_STRING: 20, 
			REGULAR_EXPRESSION: 21, 
			PATTERN: 22, 
			PSEUDO_CODE: 30
		}
	},
	
	Constants: {
		BUFFER_END: "\0"
	}, 
	
	
	CommonFunctions: {
		
		AcceptFunctions: {
			Pass: function () {
				return true;
			}, 
			Block: function () {
				return false;
			},
			Empty: function (c) {
				return (c == "");
			}
		}, 
		
		OutputFunctions: {
			Pass: function (c) {
				return c;
			}, 
			Block: function () {
				return "";
			},
			Empty: function () {
				return TCGLogic.Constants.BUFFER_END;
			}
		}
	}, 
	
	
	// Generate Initial Context of given stage
	GenerateInitialContext: function (stage) {
		var creatingContext = {};
		
		creatingContext.goalBuffer = "";
		
		var nodeCount = stage.nodes.length;
		creatingContext.nodeInstances = [];
		for (var i = 0; i < nodeCount; i++)
		{
			var currentNodeData = stage.nodes[i];
			var nodeInstance = {};
			
			if (currentNodeData.stateHas)
			{
				nodeInstance.state = currentNodeData.stateInitial;
			}
			else
			{
				nodeInstance.state = false;
			}
			
			if (typeof currentNodeData.xBufferSize != "undefined")
			{
				nodeInstance.xBuffer = "";
			}
			if (typeof currentNodeData.yBufferSize != "undefined")
			{
				nodeInstance.yBuffer = "";
			}
			
			creatingContext.nodeInstances.push(nodeInstance);
		}
		
		return creatingContext;
	}, 
	
	// Proceed One Step
	GoStep: function (stage, code, context) {
		var stepResult = {};
		
		stepResult.currentContext = context;
		stepResult.presentationEvents = [];
		stepResult.resultFlags = {
			isError: false, 
			isCleared: false, 
			isStucked: false
		};
		
		var isNotStuck = false;
		
		// Process Start Node
		var isNeedToGenerateString = false;
		var startDestination = this._Internal.GetStartConnectedNode(stage);
		if (startDestination == TCGLogic.Types.NodeId.GOAL)
		{
			isNeedToGenerateString = true;
		}
		else
		{
			var destinationIndex = TCGLogic.Types.NodeId.ToNodeIndex(startDestination);
			var destinationNodeData = stage.nodes[destinationIndex];
			var destinationNodeStateInstance = stepResult.currentContext.nodeInstances[destinationIndex];
			
			// Check Dest Buffer
			if (typeof destinationNodeData.xBufferSize != "undefined")
			{
				if (destinationNodeData.xFromId == TCGLogic.Types.NodeId.START)
				{
					if (destinationNodeStateInstance.xBuffer.length < destinationNodeData.xBufferSize)
					{
						isNeedToGenerateString = true;
					}
				}
			}
			if (typeof destinationNodeData.yBufferSize != "undefined")
			{
				if (destinationNodeData.yFromId == TCGLogic.Types.NodeId.START)
				{
					if (destinationNodeStateInstance.yBuffer.length < destinationNodeData.yBufferSize)
					{
						isNeedToGenerateString = true;
					}
				}
			}
		}
		if (isNeedToGenerateString)
		{
			var globalXArgument = null;
			var globalYArgument = null;
			if (typeof stage.globalInput != "undefined")
			{
				if (typeof stage.globalInput.x != "undefined")
				{
					globalXArgument = stage.globalInput.x;
				}
				if (typeof stage.globalInput.y != "undefined")
				{
					globalYArgument = stage.globalInput.y;
				}
			}
			
			var resultString = null;
			try {
				resultString = code.next(globalXArgument, globalYArgument);
			}
			catch (exception) {
				// Exception Occured
				stepResult.resultFlags.isError = true;
				stepResult.resultFlags.errorString = exception.message;
				return stepResult;
			}
			if (!this._Internal.IsValidStringInStageLanguage(stage, resultString))
			{
				// Invalid String Returned
				stepResult.resultFlags.isError = true;
				stepResult.resultFlags.errorString = "The Generated String is INVALID";
				return stepResult;
			}
			
			// Success
			if (resultString.length > 0)
			{
				if (startDestination == TCGLogic.Types.NodeId.GOAL)
				{
					stepResult.currentContext.goalBuffer = stepResult.currentContext.goalBuffer.concat(resultString);
					stepResult.presentationEvents.push({
						eventType: TCGLogic.Types.PresentatioEventType.OUTPUT, 
						fromId: TCGLogic.Types.NodeId.START, 
						toId: TCGLogic.Types.NodeId.GOAL, 
						sendString: resultString
					});
				}
				else
				{
					var destinationIndex = TCGLogic.Types.NodeId.ToNodeIndex(startDestination);
					var destinationNodeData = stage.nodes[destinationIndex];
					var destinationNodeStateInstance = stepResult.currentContext.nodeInstances[destinationIndex];
					
					if (typeof destinationNodeData.xBufferSize != "undefined")
					{
						if (destinationNodeData.xFromId == TCGLogic.Types.NodeId.START)
						{
							destinationNodeStateInstance.xBuffer = destinationNodeStateInstance.xBuffer.concat(resultString);
						}
					}
					if (typeof destinationNodeData.yBufferSize != "undefined")
					{
						if (destinationNodeData.yFromId == TCGLogic.Types.NodeId.START)
						{
							destinationNodeStateInstance.yBuffer = destinationNodeStateInstance.yBuffer.concat(resultString);
						}
					}
					
					stepResult.presentationEvents.push({
						eventType: TCGLogic.Types.PresentatioEventType.OUTPUT, 
						fromId: TCGLogic.Types.NodeId.START, 
						toId: startDestination, 
						sendString: resultString
					});
				}
				isNotStuck = true;
			}
		}
		
		// Process Normal Nodes
		var orderedNodeList = this._Internal.GenerateDependencyOrderedNodeList(stage);
		var nodeListLength = orderedNodeList.length;
		for (var i = 0; i < nodeListLength; i++)
		{
			var nodeIndex = orderedNodeList[i];
			var nodeData = stage.nodes[nodeIndex];
			var nodeStateInstance = stepResult.currentContext.nodeInstances[nodeIndex];
			
			var isNotFilledBufferExist = false;
			if (typeof nodeData.xBufferSize != "undefined")
			{
				if (nodeData.xFromId != TCGLogic.Types.NodeId.GLOBAL_INPUT_X)
				{
					if (nodeStateInstance.xBuffer.length < nodeData.xBufferSize)
					{
						if (nodeStateInstance.xBuffer.indexOf(TCGLogic.Constants.BUFFER_END) == -1)
						{
							isNotFilledBufferExist = true;
						}
					}
				}
			}
			if (typeof nodeData.yBufferSize != "undefined")
			{
				if (nodeData.yFromId != TCGLogic.Types.NodeId.GLOBAL_INPUT_Y)
				{
					if (nodeStateInstance.yBuffer.length < nodeData.yBufferSize)
					{
						if (nodeStateInstance.yBuffer.indexOf(TCGLogic.Constants.BUFFER_END) == -1)
						{
							isNotFilledBufferExist = true;
						}
					}
				}
			}
			
			if (isNotFilledBufferExist)
			{
				continue;
			}
			
			isNotStuck = true;
			
			// Dequeue tokens from buffer
			var tokenX = null;
			var tokenY = null;
			if (typeof nodeData.xFromId != "undefined")
			{
				if (nodeData.xFromId == TCGLogic.Types.NodeId.GLOBAL_INPUT_X)
				{
					tokenX = stage.globalInput.x;
				}
				else
				{
					var tokenDequeueResult = this._Internal.DequeueTokenFromBuffer(nodeStateInstance.xBuffer);
					tokenX = tokenDequeueResult.token;
					nodeStateInstance.xBuffer = tokenDequeueResult.remain;
				}
			}
			if (typeof nodeData.yFromId != "undefined")
			{
				if (nodeData.yFromId == TCGLogic.Types.NodeId.GLOBAL_INPUT_Y)
				{
					tokenY = stage.globalInput.y;
				}
				else
				{
					var tokenDequeueResult = this._Internal.DequeueTokenFromBuffer(nodeStateInstance.yBuffer);
					tokenY = tokenDequeueResult.token;
					nodeStateInstance.yBuffer = tokenDequeueResult.remain;
				}
			}
			
			// Judge isAccept
			var isAccepted = nodeData.acceptFunc(tokenX, tokenY, nodeStateInstance.state);
			
			// Generate Presentatio Event
			var presentionEvent = {
				id: nodeIndex, 
				isAccept: isAccepted
			};
			if (tokenX !== null)
			{
				presentionEvent.paramX = tokenX;
				presentionEvent.remainBufferX = nodeStateInstance.xBuffer;
			}
			if (tokenY !== null)
			{
				presentionEvent.paramY = tokenY;
				presentionEvent.remainBufferY = nodeStateInstance.yBuffer;
			}
			if (nodeData.stateHas)
			{
				presentionEvent.isStateOn = nodeStateInstance.state;
			}
			stepResult.presentationEvents.push(presentionEvent);
			
			if (!isAccepted)
			{
				continue;
			}
			
			// Process Output
			if (typeof nodeData.fInfo != "undefined")
			{
				var destinationId = this._Internal.FindOutputFDestination(stage, nodeIndex);
				if (destinationId !== null)
				{
					var nodeOutput = nodeData.fFunc(tokenX, tokenY, nodeStateInstance.state);
					if (nodeOutput.length > 0)
					{
						if (destinationId == TCGLogic.Types.NodeId.GOAL)
						{
							stepResult.currentContext.goalBuffer = stepResult.currentContext.goalBuffer.concat(nodeOutput);
							stepResult.presentationEvents.push({
								eventType: TCGLogic.Types.PresentatioEventType.OUTPUT, 
								fromId: nodeIndex, 
								toId: TCGLogic.Types.NodeId.GOAL, 
								sendString: nodeOutput
							});
						}
						else
						{
							var destinationNodeStateInstance = stepResult.currentContext.nodeInstances[TCGLogic.Types.NodeId.ToNodeIndex(destinationId)];
							destinationNodeStateInstance.xBuffer = destinationNodeStateInstance.xBuffer.concat(nodeOutput);
							stepResult.presentationEvents.push({
								eventType: TCGLogic.Types.PresentatioEventType.OUTPUT, 
								fromId: nodeIndex, 
								toId: destinationId, 
								sendString: nodeOutput
							});
						}
					}
				}
			}
			if (typeof nodeData.gInfo != "undefined")
			{
				var destinationId = this._Internal.FindOutputGDestination(stage, nodeIndex);
				if (destinationId !== null)
				{
					var nodeOutput = nodeData.gFunc(tokenX, tokenY, nodeStateInstance.state);
					if (nodeOutput.length > 0)
					{
						if (destinationId == TCGLogic.Types.NodeId.GOAL)
						{
							stepResult.currentContext.goalBuffer = stepResult.currentContext.goalBuffer.concat(nodeOutput);
							stepResult.presentationEvents.push({
								eventType: TCGLogic.Types.PresentatioEventType.OUTPUT, 
								fromId: nodeIndex, 
								toId: TCGLogic.Types.NodeId.GOAL, 
								sendString: nodeOutput
							});
						}
						else
						{
							var destinationNodeStateInstance = stepResult.currentContext.nodeInstances[TCGLogic.Types.NodeId.ToNodeIndex(destinationId)];
							destinationNodeStateInstance.yBuffer = destinationNodeStateInstance.yBuffer.concat(nodeOutput);
							stepResult.presentationEvents.push({
								eventType: TCGLogic.Types.PresentatioEventType.OUTPUT, 
								fromId: nodeIndex, 
								toId: destinationId, 
								sendString: nodeOutput
							});
						}
					}
				}
			}
		}
		
		// Judge Goal
		if (stepResult.currentContext.goalBuffer.length > 0)
		{
			var judgeResult = stage.goal.acceptFunc(stepResult.currentContext.goalBuffer);
			if (judgeResult)
			{
				stepResult.resultFlags.isCleared = true;
			}
		}
		
		// Stuck Result
		if (!isNotStuck && !stepResult.resultFlags.isCleared)
		{
			stepResult.resultFlags.isStucked = true;
		}
		
		return stepResult;
	},
	
	
	_Internal: {
		GenerateDependencyOrderedNodeList: function (stage) {
			var nodeCount = stage.nodes.length;
			
			// Initialize Dependency List
			var dependencyList = [];
			for (var i = 0; i < nodeCount; i++)
			{
				var currentNodeData = stage.nodes[i];
				var dependencyEntry = {
					nodeIndex: i,
					isRemoved: false, 
					dependsOnList: []
				};
				
				if (typeof currentNodeData.xBufferSize != "undefined")
				{
					if (TCGLogic.Types.NodeId.IsNormalNode(currentNodeData.xFromId))
					{
						dependencyEntry.dependsOnList.push(TCGLogic.Types.NodeId.ToNodeIndex(currentNodeData.xFromId));
					}
				}
				if (typeof currentNodeData.yBufferSize != "undefined")
				{
					if (TCGLogic.Types.NodeId.IsNormalNode(currentNodeData.yFromId))
					{
						dependencyEntry.dependsOnList.push(TCGLogic.Types.NodeId.ToNodeIndex(currentNodeData.yFromId));
					}
				}
				
				dependencyList.push(dependencyEntry);
			}
			
			// Build Ordered List
			var orderedNodeList = [];
			while (orderedNodeList.length < nodeCount)
			{
				for (var i = 0; i < nodeCount; i++)
				{
					if (dependencyList[i].isRemoved)
					{
						continue;
					}
					
					if (dependencyList[i].dependsOnList.length > 0)
					{
						continue;
					}
					
					// Independent node now
					orderedNodeList.push(dependencyList[i].nodeIndex);
					dependencyList[i].isRemoved = true;
					
					// Remove My Dependency
					for (var j = 0; j < nodeCount; j++)
					{
						if (dependencyList[j].isRemoved)
						{
							continue;
						}
						var isDependsOnMe = false;
						for (var k = 0; k < dependencyList[j].dependsOnList.length; k++)
						{
							if (dependencyList[j].dependsOnList[k] == i)
							{
								isDependsOnMe = true;
								break;
							}
						}
						if (isDependsOnMe)
						{
							dependencyList[j].dependsOnList = GetRemovedFromJSArray(dependencyList[i].dependsOnList, i);
						}
					}
				}
			}
			
			return orderedNodeList;
		}, 
		
		GetRemovedFromJSArray: function (sourceArray, itemValue) {
			var arrayLength = sourceArray.length;
			
			var resultArray = [];
			for (var i = 0; i < arrayLength; i++)
			{
				if (sourceArray[i] == itemValue)
				{
					continue;
				}
				resultArray.push(sourceArray[i]);
			}
			
			return resultArray;
		}, 
		
		GetStartConnectedNode: function (stage) {
			var nodeCount = stage.nodes.length;
			
			for (var i = 0; i < nodeCount; i++)
			{
				var currentNodeData = stage.nodes[i];
				
				if (typeof currentNodeData.xBufferSize != "undefined")
				{
					if (currentNodeData.xFromId == TCGLogic.Types.NodeId.START)
					{
						return i;
					}
				}
				if (typeof currentNodeData.yBufferSize != "undefined")
				{
					if (currentNodeData.yFromId == TCGLogic.Types.NodeId.START)
					{
						return i;
					}
				}
			}
			
			// Goal Connected? Really??
			if (stage.goal.fromId == TCGLogic.Types.NodeId.START)
			{
				return TCGLogic.Types.NodeId.GOAL;
			}
			
			// INVALID STATE!!
			return null;
		}, 
		
		IsValidStringInStageLanguage: function (stage, targetString) {
			if (typeof targetString != "string")
			{
				// Not a String
				return false;
			}
			
			var targetLength = targetString.length;
			for (var i = 0; i < targetLength; i++)
			{
				var currentChar = targetString.charAt(i);
				if (stage.setting.alphabets.indexOf(targetString.charAt(i)) == -1)
				{
					if (currentChar != TCGLogic.Constants.BUFFER_END)
					{
						return false;
					}
				}
			}
			
			return true;
		}, 
		
		DequeueTokenFromBuffer: function (bufferContents, bufferLength) {
			var dequeueResult = {};
			
			var delimiterIndex = bufferContents.indexOf(TCGLogic.Constants.BUFFER_END);
			if (delimiterIndex == -1 || delimiterIndex >= bufferLength)
			{
				if (bufferContents.length > bufferLength)
				{
					dequeueResult.token = bufferContents.substr(0, bufferLength);
					dequeueResult.remain = bufferContents.substr(bufferLength);
				}
				else
				{
					dequeueResult.token = bufferContents;
					dequeueResult.remain = "";
				}
			}
			else
			{
				dequeueResult.token = bufferContents.substr(0, delimiterIndex);
				if (delimiterIndex >= bufferContents.length - 1)
				{
					dequeueResult.remain = "";
				}
				else
				{
					dequeueResult.remain = bufferContents.substr(delimiterIndex + 1);
				}
			}
			
			return dequeueResult;
		}, 
		
		FindOutputFDestination: function (stage, sourceNodeId) {
			if (stage.goal.fromId == sourceNodeId)
			{
				return TCGLogic.Types.NodeId.GOAL;
			}
			
			var nodeCount = stage.nodes.length;
			
			for (var i = 0; i < nodeCount; i++)
			{
				var currentNodeData = stage.nodes[i];
				
				if (typeof currentNodeData.xBufferSize != "undefined")
				{
					if (currentNodeData.xFromId == sourceNodeId)
					{
						return i;
					}
				}
			}
			
			// Node Not Found
			return null;
		}, 
		
		FindOutputGDestination: function (stage, sourceNodeId) {
			if (stage.goal.fromId == sourceNodeId)
			{
				return TCGLogic.Types.NodeId.GOAL;
			}
			
			var nodeCount = stage.nodes.length;
			
			for (var i = 0; i < nodeCount; i++)
			{
				var currentNodeData = stage.nodes[i];
				
				if (typeof currentNodeData.yBufferSize != "undefined")
				{
					if (currentNodeData.yFromId == sourceNodeId)
					{
						return i;
					}
				}
			}
			
			// Node Not Found
			return null;
		}
	}
};


////////////////////////////////////////////////////////////////////////////////
// Global Utility Functions
////////////////////////////////////////////////////////////////////////////////

// Return Buffer End Special Alphabet
function E() {
	return TCGLogic.Constants.BUFFER_END;
}
