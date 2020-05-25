#!/bin/bash

# import utils
. scripts/utils.sh

DELAY=3
MAX_RETRY=10
CHANNEL_NAME="mychannel"

CC_SRC_NAME=$1
CC_SRC_VERSION="1.0"
CC_RUNTIME_LANGUAGE=node
CC_SRC_PATH=/opt/gopath/src/github.com/mrp



verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo "========= ERROR !!! FAILED to execute End-2-End Scenario ==========="
    echo
    exit 1
  fi
}

joinChannel () {
	for org in 1 2; do
	    peer=0
		joinChannelWithRetry $peer $org
		echo "===================== peer${peer}.org${org} joined channel '$CHANNEL_NAME' ===================== "
		sleep $DELAY
		echo
	   
	done
}

installChainCode () {
	for org in 1 2; do
	    peer=0
		installCCWithRetry $peer $org $CC_SRC_VERSION
		echo "===================== peer${peer}.org${org} installed chaincode '$CC_SRC_NAME' ===================== "
		sleep $DELAY
		echo
	   
	done
}

instantiateChainCode () {
	instantiateCCWIthRetry
	echo "===================== peer${peer}.org${org} instantiate chaincode '$CC_SRC_NAME' ===================== "
	sleep $DELAY
	echo

}

joinChannel
installChainCode
instantiateChainCode

