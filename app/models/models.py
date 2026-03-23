from sqlalchemy.orm import relationship
from app.database.db import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from datetime import datetime, timedelta, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    playlists = relationship("Playlist", back_populates="user")

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    category = Column(String)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    user = relationship("User", back_populates="playlists")
    videos = relationship("PlaylistVideo", back_populates="playlist")
    repos = relationship("PlaylistRepo", back_populates="playlist")

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="unique_user_playlist"),
    )

class PlaylistVideo(Base):
    __tablename__ = "playlist_videos"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"))
    youtube_video_id = Column(String)
    title = Column(String)
    channel = Column(String)
    thumbnail = Column(String)
    added_at = Column(DateTime, default=datetime.now(timezone.utc))

    playlist = relationship("Playlist", back_populates="videos")

    __table_args__ = (
        UniqueConstraint("playlist_id", "youtube_video_id", name="unique_playlist_video"),
    )


class PlaylistRepo(Base):
    __tablename__ = "playlist_repos"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"))
    name = Column(String)
    owner = Column(String)
    repo_url = Column(String)
    description = Column(String)
    stars = Column(Integer)
    added_at = Column(DateTime, default=datetime.now(timezone.utc))

    playlist = relationship("Playlist", back_populates="repos")

    __table_args__ = (
        UniqueConstraint("playlist_id", "repo_url", name="unique_playlist_repo"),
    )

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="unique_user_category"),
    )