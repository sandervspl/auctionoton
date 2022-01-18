#!/bin/bash
source deploy.secrets.sh

ROOT_USER=$_USER_ROOT

TEST_HOST=$HOST_IP
TEST_USER=$_USER_PROD
TEST_PORT=$_PORT_PROD

ACC_HOST=$HOST_IP
ACC_USER=$_USER_PROD
ACC_PORT=$_PORT_PROD

PROD_HOST=$HOST_IP
PROD_USER=$_USER_PROD
PROD_PORT=$_PORT_PROD

#Don't touch this
ENV=$1

#Environment switch
if [ "$1" = PROD ]; then
    APP_ENV=production
    PORT=$PROD_PORT
    USER=$PROD_USER
    HOST=$PROD_HOST
    PROJECT="api.$PROJECT"
    INSTANCES=1
elif [ "$1" = ACC ]; then
    APP_ENV=acceptation
    PORT=$ACC_PORT
    USER=$ACC_USER
    HOST=$ACC_HOST
    PROJECT="api-acc.$PROJECT"
    INSTANCES=1
elif [ "$1" = TEST ]; then
    APP_ENV=test
    PORT=$TEST_PORT
    USER=$TEST_USER
    HOST=$TEST_HOST
    PROJECT="api-test.$PROJECT"
    INSTANCES=1
fi

if [ -z "$PM2_CONFIG_NAME" ]; then
    PM2_CONFIG_NAME="pm2-config.json"
fi

PDIR=/var/api/$PROJECT
FILENAME=build.tar.gz
c='\033[1m'
nc='\033[0m'
red='\033[1;31m'

#Checks if correct arguments are given
if [ "$1" != ACC ] && [ "$1" != PROD ] && [ "$1" != TEST ]
then
    echo -e "🚫 $c Missing environment: PROD, ACC or TEST $nc"
    exit 0
else
    echo -e "🚀 $c Deploying $PROJECT for $1 $nc"
fi

#Get version from package.json
VERSION="v$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $W_PATH/package.json)")"

#Creating project build
echo -e "🛠 $c Creating project build $nc"
APP_ENV=$APP_ENV npm run build

#Create PM2 config file
echo -e "⚡️ $c Generating PM2 server file $nc"
VARS=$(cat <<-END 
    s/#NAME/$PROJECT/g;
    s/#PORT/$PORT/g;
    s/#APP_ENV/$APP_ENV/g;
    s/#PROJECT/$PROJECT-$VERSION/g;
    s/#INSTANCES/$INSTANCES/g;
    s/#TEMP/$W_NAME/g;
END
)
sed "$VARS" "$W_PATH/pm2-config-template.json" > $PM2_CONFIG_NAME

#Build tar and copy to server
echo -e "🚚 $c Copying files to server $nc"
mkdir -p "$W_NAME/apps/server"
cp -r ./apps/server/{dist,package.json} "$W_NAME/apps/server"
cp ./{package.json,package-lock.json,$PM2_CONFIG_NAME} $W_NAME
cp -r ./packages $W_NAME
tar -czf $FILENAME $W_NAME
scp -r ./$FILENAME $USER@$HOST:~
rm $FILENAME
rm $PM2_CONFIG_NAME
rm -rf $W_NAME

echo -e "🔑 $c Connecting to $HOST $nc"
#Set-up new files, install packages and run server
ssh $USER@$HOST << EOF
    echo -e "🐶 $c Initializing server $nc"
    if [ "$1" = TEST ]; then
        rm -rf $PDIR*
    fi
    mkdir -p $PDIR-$VERSION;
    chown $USER:$USER $PDIR-$VERSION;
    chown $USER:$USER $API_PATH;
    mv ~/$FILENAME $PDIR-$VERSION;
    su - $USER;
    echo -e "👀 $c Extracting files $nc"
    tar -zxvf $PDIR-$VERSION/$FILENAME -C $PDIR-$VERSION;
    rm $PDIR-$VERSION/$FILENAME;
    echo -e "⚡️ $c Installing packages $nc"
    . $NVM_PATH;
    npm install --production --prefix $PDIR-$VERSION/$W_NAME;
    echo -e "🏡 $c Starting server $nc"
    pm2 del $PROJECT
    pm2 start $PDIR-$VERSION/$W_NAME/$PM2_CONFIG_NAME
EOF

if [ $? -eq 0 ]; then
  echo -e "🤘 $c Successfully deployed $PROJECT $VERSION on $HOST $nc"
else
  echo -e "❌ $red Deploy failed for $PROJECT $VERSION on $HOST $nc"
fi
