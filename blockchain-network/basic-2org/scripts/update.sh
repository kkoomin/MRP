#!/bin/bash

# import utils
. scripts/utils.sh

DELAY=3
MAX_RETRY=10
CHANNEL_NAME="mychannel"
CC_SRC_NAME=$1
CC_SRC_VERSION=$2
CC_RUNTIME_LANGUAGE=node
CC_SRC_PATH=/opt/gopath/src/github.com/mrp

installChainCode () {
	for org in 1 2; do
	    peer=0
		installCCWithRetry $peer $org $CC_SRC_VERSION
		echo "===================== peer${peer}.org${org} installed chaincode '$CC_SRC_NAME' ===================== "
		sleep $DELAY
		echo
	   
	done
}



upgradeChainCode() {
	upgradeCCWIthRetry
	echo "===================== peer${peer}.org${org} upgrade chaincode '$CC_SRC_NAME' ===================== "
	sleep $DELAY
	echo
}


installChainCode
upgradeChainCode